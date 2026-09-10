const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const db = require("./database/db");
const { sendNoticeEmail } = require("./utils/mailer");

const app = express();


// ======================================================
// AUTO-CREATE NOTICES / ACADEMICS TABLES
// ======================================================
// These are managed by Admin only (Manage Notices /
// Manage Academics). Created automatically on startup
// so no manual pgAdmin step is required.

(async function ensureAdminContentTables() {

    try {

        await db.query(`
            CREATE TABLE IF NOT EXISTS notices (
                notice_id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                category TEXT DEFAULT 'General',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS academics (
                academic_id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                department TEXT DEFAULT 'General',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log("✅ Notices/Academics tables ready");

    } catch (error) {

        console.error(
            "❌ Failed to create Notices/Academics tables:",
            error.message
        );

    }

})();


// ======================================================
// BASIC MIDDLEWARE
// ======================================================

app.use(express.static(path.join(__dirname, "public")));

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

app.use(
    bodyParser.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

app.use(bodyParser.json({
    limit: "10mb"
}));

app.use(
    session({
        secret: "campusloop_secret_key",
        resave: false,
        saveUninitialized: true
    })
);


// ======================================================
// EVENT FILE UPLOAD CONFIGURATION
// ======================================================

const uploadFolder = path.join(
    __dirname,
    "uploads",
    "events"
);


// Create uploads/events folder automatically

if (!fs.existsSync(uploadFolder)) {

    fs.mkdirSync(uploadFolder, {
        recursive: true
    });

}


const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, uploadFolder);

    },

    filename: function (req, file, cb) {

        const eventName =
            (req.body.eventName || "event")
                .replace(/[^a-z0-9]/gi, "_")
                .replace(/_+/g, "_");

        const uniqueName =
            Date.now() +
            "_" +
            eventName +
            "_" +
            file.originalname;

        cb(null, uniqueName);

    }

});


const upload = multer({
    storage: storage
});


// ======================================================
// HOME PAGE
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "index.html"
        )
    );

});


// ======================================================
// LOGIN PAGE
// ======================================================

app.get("/login", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "login.html"
        )
    );

});


// ======================================================
// REGISTER PAGE
// ======================================================

app.get("/register", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "register.html"
        )
    );

});


// ======================================================
// LOGOUT
// ======================================================

app.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            console.error(
                "Logout error:",
                err
            );

            return res.send(
                "Logout Failed!"
            );

        }

        res.redirect("/login");

    });

});


// ======================================================
// REGISTER
// ======================================================

app.post("/register", async (req, res) => {

    const {
        full_name,
        email,
        password,
        role
    } = req.body || {};


    try {

        // Check required fields

        if (
            !full_name ||
            !email ||
            !password ||
            !role
        ) {

            return res.send(
                "Please fill all required fields."
            );

        }


        // Hash password

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        // Insert user

        await db.query(
            `
            INSERT INTO users
            (
                full_name,
                email,
                password,
                role
            )
            VALUES
            ($1, $2, $3, $4)
            `,
            [
                full_name,
                email,
                hashedPassword,
                role
            ]
        );


        res.send(`

            <!DOCTYPE html>

            <html>

            <head>

                <title>Registration Successful</title>

                <style>

                    body {
                        font-family: Arial, sans-serif;
                        background: #f4f7ff;
                        text-align: center;
                        padding-top: 100px;
                    }

                    .box {
                        background: white;
                        width: 400px;
                        max-width: 90%;
                        margin: auto;
                        padding: 35px;
                        border-radius: 15px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.10);
                    }

                    h2 {
                        color: #3155d9;
                    }

                    a {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 10px 18px;
                        background: #3155d9;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                    }

                </style>

            </head>

            <body>

                <div class="box">

                    <h2>
                        Registration Successful! 🎉
                    </h2>

                    <p>
                        Your CampusLoop account has been created.
                    </p>

                    <a href="/login">
                        Go to Login
                    </a>

                </div>

            </body>

            </html>

        `);


    } catch (error) {

        console.error(
            "REGISTRATION ERROR:",
            error
        );


        res.send(
            "Registration Failed! Please check your details."
        );

    }

});


// ======================================================
// LOGIN
// ======================================================

app.post("/login", async (req, res) => {

    const {
        email,
        password
    } = req.body || {};


    try {

        if (
            !email ||
            !password
        ) {

            return res.send(
                "Please enter email and password."
            );

        }


        // Find user

        const result =
            await db.query(
                `
                SELECT *
                FROM users
                WHERE email = $1
                `,
                [email]
            );


        console.log(
            "================================"
        );

        console.log(
            "LOGIN EMAIL RECEIVED:",
            email
        );

        console.log(
            "USERS FOUND:",
            result.rows.length
        );


        // User does not exist

        if (
            result.rows.length === 0
        ) {

            return res.send(
                "Invalid Email or Password!"
            );

        }


        const user =
            result.rows[0];


        console.log(
            "USER FOUND:",
            user.email
        );

        console.log(
            "ROLE:",
            user.role
        );


        // Check password

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        console.log(
            "PASSWORD MATCH:",
            passwordMatch
        );


        if (!passwordMatch) {

            return res.send(
                "Invalid Email or Password!"
            );

        }


        // Save user in session

        req.session.user = {

    id: user.user_id,

    full_name:
        user.full_name,

    email:
        user.email,

    department:
        user.department,

    class_name:
        user.class_name,

    role:
        user.role

};


        // Redirect according to role
        // (case-insensitive, trimmed, so "Student",
        // "student", "STUDENT " etc all work the same)

        const normalizedRole =
            (user.role || "").toLowerCase().trim();

        if (
            normalizedRole === "student"
        ) {

            return res.redirect(
                "/student"
            );

        }


        if (
            normalizedRole === "teacher"
        ) {

            return res.redirect(
                "/teacher"
            );

        }


        if (
            normalizedRole === "admin"
        ) {

            return res.redirect(
                "/admin"
            );

        }


        return res.send(
            "Invalid user role!"
        );


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        res.send(
            "Login Failed!"
        );

    }

});


// ======================================================
// STUDENT DASHBOARD
// ======================================================

app.get("/student", (req, res) => {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect(
            "/login"
        );

    }


    res.sendFile(
        path.join(
            __dirname,
            "views",
            "student.html"
        )
    );

});


// ======================================================
// TEACHER DASHBOARD
// ======================================================

app.get("/teacher", (req, res) => {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect(
            "/login"
        );

    }


    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase().trim() !==
        "teacher"
    ) {

        return res.send(
            "Access Denied!"
        );

    }


    res.sendFile(
        path.join(
            __dirname,
            "views",
            "teacher.html"
        )
    );

});


// ======================================================
// ADMIN DASHBOARD
// ======================================================

app.get("/admin", (req, res) => {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect(
            "/login"
        );

    }


    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase().trim() !==
        "admin"
    ) {

        return res.send(
            "Access Denied!"
        );

    }


    res.sendFile(
        path.join(
            __dirname,
            "views",
            "admin.html"
        )
    );

});

// ======================================================
// ADMIN - MANAGE STUDENTS PAGE
// ======================================================

app.get("/admin/students", async (req, res) => {

    // CHECK LOGIN
    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect("/login");

    }


    // CHECK ADMIN
    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {

        return res.status(403).send(
            "Access Denied!"
        );

    }


    try {

        // GET ALL STUDENTS
        const result = await db.query(`

            SELECT
                user_id,
                full_name,
                email,
                department,
                class_name

            FROM users

            WHERE LOWER(role) = 'student'

            ORDER BY full_name ASC

        `);


        // SEND STUDENT PAGE
        res.send(`
            
            <!DOCTYPE html>

            <html>

            <head>

                <title>
                    Manage Students - CampusLoop
                </title>

                <style>

                    body {
                        font-family: Arial, sans-serif;
                        background: #f4f6fb;
                        margin: 0;
                        padding: 30px;
                    }

                    h1 {
                        color: #111827;
                    }

                    .back-button {
                        display: inline-block;
                        padding: 10px 18px;
                        background: #3155d9;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        margin-bottom: 25px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background: white;
                        border-radius: 10px;
                        overflow: hidden;
                    }

                    th,
                    td {
                        padding: 14px;
                        text-align: left;
                        border-bottom: 1px solid #eee;
                    }

                    th {
                        background: #3155d9;
                        color: white;
                    }

                    tr:hover {
                        background: #f8f9ff;
                    }

                    .empty {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                    }

                </style>

            </head>


            <body>

                <a
                    href="/admin"
                    class="back-button"
                >
                    ? Back to Admin Dashboard
                </a>


                <h1>
                    Manage Students
                </h1>


                <p>
                    View all registered student accounts.
                </p>


                ${
                    result.rows.length === 0

                    ?

                    `
                    <div class="empty">
                        No students are registered yet.
                    </div>
                    `

                    :

                    `
                    <table id="studentsTable">

    <thead>

        <tr>

            <th>Name</th>

            <th>Email</th>

            <th>Department</th>

            <th>Class</th>

            <th>Actions</th>

        </tr>

    </thead>

    <tbody id="studentsTableBody">
                  
    ${result.rows.map(student => `

        <tr>

            <td>
                ${student.full_name || ""}
            </td>

            <td>
                ${student.email || ""}
            </td>

            <td>
                ${student.department || ""}
            </td>

            <td>
                ${student.class_name || ""}
            </td>

            <td>

                <button
    type="button"
    onclick="editStudent(this)"
    data-id="${student.user_id}"
>
    &#9999;&#65039; Edit
</button>

<button
    type="button"
    onclick="deleteStudent(this)"
    data-id="${student.user_id}"
>
    &#128465;&#65039; Delete
</button>

            </td>

        </tr>

    `).join("")}

</tbody>

                    </table>
                    `

                }

				<script>

function editStudent(button) {

    const studentId =
        button.getAttribute("data-id");

    const row =
        button.closest("tr");

    const name =
        row.cells[0].textContent.trim();

    const email =
        row.cells[1].textContent.trim();

    const department =
        row.cells[2].textContent.trim();

    const className =
        row.cells[3].textContent.trim();


    const newName =
        prompt("Enter student name:", name);

    if (newName === null) return;


    const newEmail =
        prompt("Enter student email:", email);

    if (newEmail === null) return;


    const newDepartment =
        prompt(
            "Enter department:",
            department
        );

    if (newDepartment === null) return;


    const newClass =
        prompt(
            "Enter class:",
            className
        );

    if (newClass === null) return;


    fetch(
        "/api/admin/students/" + studentId,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                full_name: newName,
                email: newEmail,
                department: newDepartment,
                class_name: newClass

            })

        }
    )
    .then(response => response.json())
    .then(result => {

        if (result.message) {

            alert(result.message);

        }

        location.reload();

    })
    .catch(error => {

        console.error(error);

        alert("Unable to update student.");

    });

}

async function deleteStudent(button) {

    const studentId =
        button.getAttribute("data-id");


    const row =
        button.closest("tr");


    const studentName =
        row.cells[0].textContent.trim();


    const confirmDelete =
        confirm(
            "Are you sure you want to delete " +
            studentName +
            "?"
        );


    if (!confirmDelete) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/admin/students/" + studentId,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.message ||
                "Failed to delete student."
            );

            return;

        }


        alert(
            "Student deleted successfully!"
        );


        row.remove();


    } catch (error) {

        console.error(
            "Delete student error:",
            error
        );


        alert(
            "Unable to delete student."
        );

    }

}

</script>
				
            </body>

            </html>

        `);

    }


    catch (error) {

        console.error(
            "Admin student page error:",
            error
        );

        res.status(500).send(
            "Unable to load students."
        );

    }

});


// ======================================================
// ADMIN - MANAGE TEACHERS PAGE
// ======================================================

app.get("/admin/teachers", async (req, res) => {

    // CHECK LOGIN
    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect("/login");

    }


    // CHECK ADMIN
    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {

        return res.status(403).send(
            "Access Denied!"
        );

    }


    try {

        // GET ALL TEACHERS
        const result = await db.query(`

            SELECT
                user_id,
                full_name,
                email,
                department

            FROM users

            WHERE LOWER(role) = 'teacher'

            ORDER BY full_name ASC

        `);


        // SEND TEACHER PAGE
        res.send(`
            
            <!DOCTYPE html>

            <html>

            <head>

                <title>
                    Manage Teachers - CampusLoop
                </title>

                <style>

                    body {
                        font-family: Arial, sans-serif;
                        background: #f4f6fb;
                        margin: 0;
                        padding: 30px;
                    }

                    h1 {
                        color: #111827;
                    }

                    .back-button {
                        display: inline-block;
                        padding: 10px 18px;
                        background: #3155d9;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        margin-bottom: 25px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background: white;
                        border-radius: 10px;
                        overflow: hidden;
                    }

                    th,
                    td {
                        padding: 14px;
                        text-align: left;
                        border-bottom: 1px solid #eee;
                    }

                    th {
                        background: #3155d9;
                        color: white;
                    }

                    tr:hover {
                        background: #f8f9ff;
                    }

                    .empty {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                    }

                </style>

            </head>


            <body>

                <a
                    href="/admin"
                    class="back-button"
                >
                    ? Back to Admin Dashboard
                </a>


                <h1>
                    Manage Teachers
                </h1>


                <p>
                    View all registered teacher accounts.
                </p>


                ${
                    result.rows.length === 0

                    ?

                    `
                    <div class="empty">
                        No teachers are registered yet.
                    </div>
                    `

                    :

                    `
                    <table id="teachersTable">

    <thead>

        <tr>

            <th>Name</th>

            <th>Email</th>

            <th>Department</th>

            <th>Actions</th>

        </tr>

    </thead>

    <tbody id="teachersTableBody">
                  
    ${result.rows.map(teacher => `

        <tr>

            <td>
                ${teacher.full_name || ""}
            </td>

            <td>
                ${teacher.email || ""}
            </td>

            <td>
                ${teacher.department || ""}
            </td>

            <td>

                <button
    type="button"
    onclick="editTeacher(this)"
    data-id="${teacher.user_id}"
>
    &#9999;&#65039; Edit
</button>

<button
    type="button"
    onclick="deleteTeacher(this)"
    data-id="${teacher.user_id}"
>
    &#128465;&#65039; Delete
</button>

            </td>

        </tr>

    `).join("")}

</tbody>

                    </table>
                    `

                }

				<script>

function editTeacher(button) {

    const teacherId =
        button.getAttribute("data-id");

    const row =
        button.closest("tr");

    const name =
        row.cells[0].textContent.trim();

    const email =
        row.cells[1].textContent.trim();

    const department =
        row.cells[2].textContent.trim();


    const newName =
        prompt("Enter teacher name:", name);

    if (newName === null) return;


    const newEmail =
        prompt("Enter teacher email:", email);

    if (newEmail === null) return;


    const newDepartment =
        prompt(
            "Enter department:",
            department
        );

    if (newDepartment === null) return;


    fetch(
        "/api/admin/teachers/" + teacherId,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                full_name: newName,
                email: newEmail,
                department: newDepartment

            })

        }
    )
    .then(response => response.json())
    .then(result => {

        if (result.message) {

            alert(result.message);

        }

        location.reload();

    })
    .catch(error => {

        console.error(error);

        alert("Unable to update teacher.");

    });

}

async function deleteTeacher(button) {

    const teacherId =
        button.getAttribute("data-id");


    const row =
        button.closest("tr");


    const teacherName =
        row.cells[0].textContent.trim();


    const confirmDelete =
        confirm(
            "Are you sure you want to delete " +
            teacherName +
            "?"
        );


    if (!confirmDelete) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/admin/teachers/" + teacherId,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.message ||
                "Failed to delete teacher."
            );

            return;

        }


        alert(
            "Teacher deleted successfully!"
        );


        row.remove();


    } catch (error) {

        console.error(
            "Delete teacher error:",
            error
        );


        alert(
            "Unable to delete teacher."
        );

    }

}

</script>
				
            </body>

            </html>

        `);

    }


    catch (error) {

        console.error(
            "Admin teacher page error:",
            error
        );

        res.status(500).send(
            "Unable to load teachers."
        );

    }

});


// ======================================================
// EVENTS
// ======================================================

app.get("/events", (req, res) => {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect(
            "/login"
        );

    }


    res.sendFile(
        path.join(
            __dirname,
            "views",
            "events.html"
        )
    );

});


// ======================================================
// CURRENT USER API
// ======================================================

app.get("/api/user", (req, res) => {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.status(401).json({

            message:
                "Not logged in"

        });

    }


    res.json(
        req.session.user
    );

});

// ======================================================
// ADMIN - DASHBOARD STATISTICS
// ======================================================

app.get("/api/admin/stats", async (req, res) => {

    // CHECK LOGIN
    if (
        !req.session ||
        !req.session.user
    ) {

        return res.status(401).json({
            message: "Not logged in"
        });

    }


    // CHECK ADMIN
    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {

        return res.status(403).json({
            message: "Access Denied"
        });

    }


    try {

        const result = await db.query(`

            SELECT

                COUNT(*) AS total_users,

                COUNT(*) FILTER (
                    WHERE LOWER(role) = 'student'
                ) AS total_students,

                COUNT(*) FILTER (
                    WHERE LOWER(role) = 'teacher'
                ) AS total_teachers

            FROM users

        `);


        res.json({

            students:
                Number(result.rows[0].total_students),

            teachers:
                Number(result.rows[0].total_teachers),

            users:
                Number(result.rows[0].total_users)

        });


    } catch (error) {

        console.error(
            "Admin stats error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to load admin statistics"

        });

    }

});

// ======================================================
// ADMIN - VIEW STUDENTS API
// ======================================================

app.get(
    "/api/admin/students",
    async (req, res) => {

        // ------------------------------------------
        // CHECK LOGIN
        // ------------------------------------------

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.status(401).json({

                message:
                    "Not logged in"

            });

        }


        // ------------------------------------------
        // CHECK ADMIN ROLE
        // ------------------------------------------

        if (
            !req.session.user.role ||
            req.session.user.role.toLowerCase() !== "admin"
        ) {

            return res.status(403).json({

                message:
                    "Access Denied"

            });

        }


        try {

            // --------------------------------------
            // GET STUDENTS
            // --------------------------------------

            const result =
                await db.query(`

                    SELECT

                        user_id,
                        full_name,
                        email,
                        department,
                        class_name

                    FROM users

                    WHERE LOWER(role) = 'student'

                    ORDER BY full_name ASC

                `);


            // --------------------------------------
            // SEND STUDENTS
            // --------------------------------------

            res.json({

                students:
                    result.rows

            });

        }
        catch (error) {

            console.error(
                "Admin student API error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to load students"

            });

        }

    }
);

// ======================================================
// ADMIN - UPDATE STUDENT
// ======================================================

app.put("/api/admin/students/:id", async (req, res) => {

    // CHECK LOGIN
    if (!req.session || !req.session.user) {

        return res.status(401).json({
            message: "Not logged in"
        });

    }

    // CHECK ADMIN
    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {

        return res.status(403).json({
            message: "Access Denied"
        });

    }

    try {

        const studentId = req.params.id;

        const {
            full_name,
            email,
            department,
            class_name
        } = req.body;


        // UPDATE STUDENT
        const result = await db.query(

            `
            UPDATE users

            SET
                full_name = $1,
                email = $2,
                department = $3,
                class_name = $4

            WHERE
                user_id = $5
                AND LOWER(role) = 'student'

            RETURNING
                user_id,
                full_name,
                email,
                department,
                class_name
            `,

            [
                full_name,
                email,
                department,
                class_name,
                studentId
            ]

        );


        // STUDENT NOT FOUND
        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Student not found"
            });

        }


        res.json({

            message: "Student updated successfully",

            student: result.rows[0]

        });


    } catch (error) {

        console.error(
            "Admin update student error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to update student"

        });

    }

});


// ======================================================
// ADMIN - DELETE STUDENT
// ======================================================

app.delete("/api/admin/students/:id", async (req, res) => {

    // CHECK LOGIN
    if (!req.session || !req.session.user) {

        return res.status(401).json({
            message: "Not logged in"
        });

    }


    // CHECK ADMIN
    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {

        return res.status(403).json({
            message: "Access Denied"
        });

    }


    try {

        const studentId = req.params.id;


        const result = await db.query(

            `
            DELETE FROM users

            WHERE
                user_id = $1
                AND LOWER(role) = 'student'

            RETURNING user_id
            `,

            [studentId]

        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                message:
                    "Student not found"

            });

        }


        res.json({

            message:
                "Student deleted successfully"

        });


    } catch (error) {

        console.error(
            "Admin delete student error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to delete student"

        });

    }

});

// ======================================================
// ADMIN - VIEW TEACHERS API
// ======================================================

app.get(
    "/api/admin/teachers",
    async (req, res) => {

        // CHECK LOGIN
        if (
            !req.session ||
            !req.session.user
        ) {

            return res.status(401).json({
                message: "Not logged in"
            });

        }


        // CHECK ADMIN
        if (
            !req.session.user.role ||
            req.session.user.role.toLowerCase() !== "admin"
        ) {

            return res.status(403).json({
                message: "Access Denied"
            });

        }


        try {

            const result = await db.query(`

                SELECT

                    user_id,
                    full_name,
                    email,
                    department

                FROM users

                WHERE LOWER(role) = 'teacher'

                ORDER BY full_name ASC

            `);


            res.json({

                teachers:
                    result.rows

            });

        }
        catch (error) {

            console.error(
                "Admin teacher API error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to load teachers"

            });

        }

    }
);


// ======================================================
// ADMIN - UPDATE TEACHER
// ======================================================

app.put("/api/admin/teachers/:id", async (req, res) => {

    // CHECK LOGIN
    if (!req.session || !req.session.user) {

        return res.status(401).json({
            message: "Not logged in"
        });

    }

    // CHECK ADMIN
    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {

        return res.status(403).json({
            message: "Access Denied"
        });

    }

    try {

        const teacherId = req.params.id;

        const {
            full_name,
            email,
            department
        } = req.body;


        const result = await db.query(

            `
            UPDATE users

            SET
                full_name = $1,
                email = $2,
                department = $3

            WHERE
                user_id = $4
                AND LOWER(role) = 'teacher'

            RETURNING
                user_id,
                full_name,
                email,
                department
            `,

            [
                full_name,
                email,
                department,
                teacherId
            ]

        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Teacher not found"
            });

        }


        res.json({

            message: "Teacher updated successfully",

            teacher: result.rows[0]

        });


    } catch (error) {

        console.error(
            "Admin update teacher error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to update teacher"

        });

    }

});


// ======================================================
// ADMIN - DELETE TEACHER
// ======================================================

app.delete("/api/admin/teachers/:id", async (req, res) => {

    // CHECK LOGIN
    if (!req.session || !req.session.user) {

        return res.status(401).json({
            message: "Not logged in"
        });

    }


    // CHECK ADMIN
    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {

        return res.status(403).json({
            message: "Access Denied"
        });

    }


    try {

        const teacherId = req.params.id;


        const result = await db.query(

            `
            DELETE FROM users

            WHERE
                user_id = $1
                AND LOWER(role) = 'teacher'

            RETURNING user_id
            `,

            [teacherId]

        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                message:
                    "Teacher not found"

            });

        }


        res.json({

            message:
                "Teacher deleted successfully"

        });


    } catch (error) {

        console.error(
            "Admin delete teacher error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to delete teacher"

        });

    }

});

// ======================================================
// PUBLIC (LOGGED-IN) - VIEW NOTICES API
// ======================================================
// Used by Student and Teacher dashboards to display
// notices that Admin creates via Manage Notices.

app.get("/api/notices", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    try {

        const result = await db.query(`
            SELECT notice_id, title, message, category, created_at
            FROM notices
            ORDER BY created_at DESC
        `);

        res.json({ notices: result.rows });

    } catch (error) {

        console.error("Notices API error:", error);

        res.status(500).json({ message: "Failed to load notices" });

    }

});


// ======================================================
// ADMIN - MANAGE NOTICES API (modal-based)
// ======================================================

app.get("/api/admin/notices", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {
        return res.status(403).json({ message: "Access Denied" });
    }

    try {

        const result = await db.query(`
            SELECT notice_id, title, message, category, created_at
            FROM notices
            ORDER BY created_at DESC
        `);

        res.json({ notices: result.rows });

    } catch (error) {

        console.error("Admin notices list error:", error);

        res.status(500).json({ message: "Failed to load notices" });

    }

});


app.post("/api/admin/notices", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {
        return res.status(403).json({ message: "Access Denied" });
    }

    try {

        const { title, message, category } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                message: "Title and message are required"
            });
        }

        const result = await db.query(
            `
            INSERT INTO notices (title, message, category)
            VALUES ($1, $2, $3)
            RETURNING notice_id, title, message, category, created_at
            `,
            [title, message, category || "General"]
        );

        // ----------------------------------------------
        // EMAIL NOTIFICATION
        // ----------------------------------------------
        // Notify every Student and Teacher by email.
        // This never blocks/fails notice creation — if
        // email isn't configured or sending fails, the
        // notice is still saved and returned normally.

        let emailStatus = {
            sent: false,
            reason: "Not attempted"
        };

        try {

            const recipientsResult = await db.query(`
                SELECT email
                FROM users
                WHERE LOWER(role) = 'student'
                   OR LOWER(role) = 'teacher'
            `);

            const recipients = recipientsResult.rows
                .map(row => row.email)
                .filter(Boolean);

            emailStatus = await sendNoticeEmail({
                recipients,
                title,
                message,
                category: category || "General"
            });

        } catch (emailError) {

            console.error(
                "Notice email lookup/send error:",
                emailError
            );

            emailStatus = {
                sent: false,
                reason: emailError.message
            };

        }

        res.json({
            message: "Notice created successfully",
            notice: result.rows[0],
            emailStatus: emailStatus
        });

    } catch (error) {

        console.error("Admin create notice error:", error);

        res.status(500).json({ message: "Failed to create notice" });

    }

});


app.put("/api/admin/notices/:id", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {
        return res.status(403).json({ message: "Access Denied" });
    }

    try {

        const noticeId = req.params.id;
        const { title, message, category } = req.body;

        const result = await db.query(
            `
            UPDATE notices
            SET title = $1, message = $2, category = $3
            WHERE notice_id = $4
            RETURNING notice_id, title, message, category, created_at
            `,
            [title, message, category || "General", noticeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Notice not found" });
        }

        res.json({
            message: "Notice updated successfully",
            notice: result.rows[0]
        });

    } catch (error) {

        console.error("Admin update notice error:", error);

        res.status(500).json({ message: "Failed to update notice" });

    }

});


app.delete("/api/admin/notices/:id", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {
        return res.status(403).json({ message: "Access Denied" });
    }

    try {

        const noticeId = req.params.id;

        const result = await db.query(
            `
            DELETE FROM notices
            WHERE notice_id = $1
            RETURNING notice_id
            `,
            [noticeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Notice not found" });
        }

        res.json({ message: "Notice deleted successfully" });

    } catch (error) {

        console.error("Admin delete notice error:", error);

        res.status(500).json({ message: "Failed to delete notice" });

    }

});


// ======================================================
// ADMIN - MANAGE ACADEMICS API (modal-based, admin-only)
// ======================================================

app.get("/api/admin/academics", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {
        return res.status(403).json({ message: "Access Denied" });
    }

    try {

        const result = await db.query(`
            SELECT academic_id, title, description, department, created_at
            FROM academics
            ORDER BY created_at DESC
        `);

        res.json({ academics: result.rows });

    } catch (error) {

        console.error("Admin academics list error:", error);

        res.status(500).json({ message: "Failed to load academics" });

    }

});


app.post("/api/admin/academics", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {
        return res.status(403).json({ message: "Access Denied" });
    }

    try {

        const { title, description, department } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        const result = await db.query(
            `
            INSERT INTO academics (title, description, department)
            VALUES ($1, $2, $3)
            RETURNING academic_id, title, description, department, created_at
            `,
            [title, description, department || "General"]
        );

        res.json({
            message: "Academic entry created successfully",
            academic: result.rows[0]
        });

    } catch (error) {

        console.error("Admin create academic error:", error);

        res.status(500).json({ message: "Failed to create academic entry" });

    }

});


app.put("/api/admin/academics/:id", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {
        return res.status(403).json({ message: "Access Denied" });
    }

    try {

        const academicId = req.params.id;
        const { title, description, department } = req.body;

        const result = await db.query(
            `
            UPDATE academics
            SET title = $1, description = $2, department = $3
            WHERE academic_id = $4
            RETURNING academic_id, title, description, department, created_at
            `,
            [title, description, department || "General", academicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Academic entry not found" });
        }

        res.json({
            message: "Academic entry updated successfully",
            academic: result.rows[0]
        });

    } catch (error) {

        console.error("Admin update academic error:", error);

        res.status(500).json({ message: "Failed to update academic entry" });

    }

});


app.delete("/api/admin/academics/:id", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    if (
        !req.session.user.role ||
        req.session.user.role.toLowerCase() !== "admin"
    ) {
        return res.status(403).json({ message: "Access Denied" });
    }

    try {

        const academicId = req.params.id;

        const result = await db.query(
            `
            DELETE FROM academics
            WHERE academic_id = $1
            RETURNING academic_id
            `,
            [academicId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Academic entry not found" });
        }

        res.json({ message: "Academic entry deleted successfully" });

    } catch (error) {

        console.error("Admin delete academic error:", error);

        res.status(500).json({ message: "Failed to delete academic entry" });

    }

});


// ======================================================
// TEACHER - VIEW STUDENTS API
// ======================================================
//
// IMPORTANT:
// This route exists ONLY ONCE.
// The duplicate student API routes
// from your previous server.js have
// been removed.
//
// ======================================================

app.get(
    "/api/teacher/students",
    async (req, res) => {

        // ------------------------------------------
        // CHECK LOGIN
        // ------------------------------------------

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.status(401).json({

                message:
                    "Not logged in"

            });

        }


        // ------------------------------------------
        // CHECK TEACHER ROLE
        // ------------------------------------------

if (
    !req.session.user.role ||
    req.session.user.role.toLowerCase() !== "teacher"
) {

    return res.status(403).json({

        message:
            "Access Denied"

    });

}


        try {

            // --------------------------------------
            // GET FILTER VALUES
            // --------------------------------------

            const {
                search = "",
                department = "all",
                year = "all"
            } = req.query;


            // --------------------------------------
            // BASE QUERY
            // --------------------------------------

            let query = `

                SELECT

                    user_id,

                    full_name,

                    email,

                    department,

                    class_name

                FROM users

                WHERE role = 'Student'

            `;


            const values = [];


            // --------------------------------------
            // SEARCH BY NAME OR EMAIL
            // --------------------------------------

            if (
                search.trim() !== ""
            ) {

                values.push(
                    `%${search.trim()}%`
                );


                query += `

                    AND (

                        full_name ILIKE
                        $${values.length}

                        OR

                        email ILIKE
                        $${values.length}

                    )

                `;

            }


            // --------------------------------------
            // DEPARTMENT FILTER
            // --------------------------------------

            if (
                department !== "all"
            ) {

                values.push(
                    department
                );


                query += `

                    AND department =
                    $${values.length}

                `;

            }


            // --------------------------------------
            // YEAR FILTER
            // --------------------------------------

            if (
                year !== "all"
            ) {

                let yearPattern =
                    `%${year}%`;


                values.push(
                    yearPattern
                );


                query += `

                    AND class_name ILIKE
                    $${values.length}

                `;

            }


            // --------------------------------------
            // SORT
            // --------------------------------------

            query += `

                ORDER BY
                full_name ASC

            `;


            // --------------------------------------
            // RUN DATABASE QUERY
            // --------------------------------------

            const result =
                await db.query(
                    query,
                    values
                );


            // --------------------------------------
            // CONVERT DATA
            // --------------------------------------

            const students =
                result.rows.map(
                    function(student) {

                        let studentYear =
                            "";


                        if (
                            student.class_name
                        ) {

                            const classText =
                                student.class_name
                                    .toLowerCase();


                            // First Year

                            if (
                                classText.includes(
                                    "1st"
                                ) ||

                                classText.includes(
                                    "first"
                                )
                            ) {

                                studentYear =
                                    "First Year";

                            }


                            // Second Year

                            else if (
                                classText.includes(
                                    "2nd"
                                ) ||

                                classText.includes(
                                    "second"
                                )
                            ) {

                                studentYear =
                                    "Second Year";

                            }


                            // Third Year

                            else if (
                                classText.includes(
                                    "3rd"
                                ) ||

                                classText.includes(
                                    "third"
                                )
                            ) {

                                studentYear =
                                    "Third Year";

                            }

                        }


                        return {

                            user_id:
                                student.user_id,

                            full_name:
                                student.full_name,

                            email:
                                student.email,

                            department:
                                student.department,

                            year:
                                studentYear,

                            class_name:
                                student.class_name

                        };

                    }
                );


            // --------------------------------------
            // SEND STUDENTS
            // --------------------------------------

            res.json(
                students
            );


        } catch (error) {

            console.error(
                "TEACHER STUDENTS ERROR:",
                error
            );


            res.status(500).json({

    message:
        "Unable to load students",

    error:
        error.message

});

        }

    }
);


// ======================================================
// EVENT REPORT PDF
// ======================================================

app.get(
    "/event-report",
    (req, res) => {

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.redirect(
                "/login"
            );

        }


        const PDFDocument =
            require("pdfkit");


        const doc =
            new PDFDocument();


        res.setHeader(
            "Content-Type",
            "application/pdf"
        );


        res.setHeader(
            "Content-Disposition",
            "attachment; filename=CampusLoop_Event_Report.pdf"
        );


        doc.pipe(res);


        // --------------------------------------
        // REPORT TITLE
        // --------------------------------------

        doc
            .fontSize(24)
            .text(
                "CampusLoop",
                {
                    align: "center"
                }
            );


        doc.moveDown();


        doc
            .fontSize(20)
            .text(
                "Event Report",
                {
                    align: "center"
                }
            );


        doc.moveDown(2);


        // --------------------------------------
        // EVENT INFORMATION
        // --------------------------------------

        doc.fontSize(14);


        doc.text(
            "Event Name: Tech Fest 2026"
        );


        doc.moveDown();


        doc.text(
            "Date: 15 August 2026"
        );


        doc.moveDown();


        doc.text(
            "Venue: College Auditorium"
        );


        doc.moveDown();


        doc.text(
            "Number of Participants: 150"
        );


        doc.moveDown(2);


        // --------------------------------------
        // SUMMARY
        // --------------------------------------

        doc
            .fontSize(16)
            .text(
                "Event Summary"
            );


        doc.moveDown();


        doc
            .fontSize(12)
            .text(
                "Tech Fest 2026 was conducted successfully at the college auditorium. " +
                "The event included various technical activities and was attended by " +
                "150 participants."
            );


        doc.moveDown(2);


        doc
            .fontSize(14)
            .text(
                "Generated by: CampusLoop"
            );


        doc
            .fontSize(12)
            .text(
                `Teacher: ${req.session.user.full_name}`
            );


        doc.end();

    }
);


// ======================================================
// GENERATE ACTIVITY REPORT PDF (server-side, PDFKit)
// ======================================================
// Replaces the old client-side html2pdf/html2canvas flow,
// which depended on a CDN library and browser canvas
// rendering and was producing blank PDFs. This route
// takes the exact same form fields from report.html and
// renders a real, reliable PDF on the server.

app.post(
    "/generate-report",
    async (req, res) => {

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.status(401).json({
                message: "Not logged in"
            });

        }

        try {

            const PDFDocument = require("pdfkit");

            const data = req.body || {};

            const get = (key) =>
                (data[key] && String(data[key]).trim()) ||
                "Not provided";

            const doc = new PDFDocument({
                margin: 50
            });

            res.setHeader(
                "Content-Type",
                "application/pdf"
            );

            const safeName =
                (data.activityName || "CampusLoop_Activity")
                    .replace(/[^a-z0-9]/gi, "_")
                    .replace(/_+/g, "_");

            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${safeName}_Report.pdf`
            );

            doc.pipe(res);

            // --------------------------------------
            // OPTIONAL HEADER IMAGE
            // --------------------------------------

            if (
                data.headerImage &&
                typeof data.headerImage === "string" &&
                data.headerImage.startsWith("data:image")
            ) {

                try {

                    const base64Data =
                        data.headerImage.split(",")[1];

                    const imgBuffer =
                        Buffer.from(base64Data, "base64");

                    doc.image(imgBuffer, {
                        fit: [150, 80],
                        align: "center"
                    });

                    doc.moveDown();

                } catch (imgError) {

                    console.error(
                        "Header image skipped:",
                        imgError.message
                    );

                }

            }

            // --------------------------------------
            // HEADER
            // --------------------------------------

            doc
                .fontSize(20)
                .text(get("collegeName") === "Not provided" ? "CampusLoop" : get("collegeName"), {
                    align: "center"
                });

            doc
                .fontSize(13)
                .text(get("department"), { align: "center" });

            doc
                .fontSize(11)
                .text(`Academic Year: ${get("academicYear")}`, { align: "center" });

            doc
                .fontSize(11)
                .text(`IQAC / Document No: ${get("documentNumber")}`, { align: "center" });

            doc.moveDown();

            doc
                .moveTo(50, doc.y)
                .lineTo(545, doc.y)
                .stroke();

            doc.moveDown();

            doc
                .fontSize(18)
                .text("ACTIVITY REPORT", { align: "center" });

            doc.moveDown(1.5);

            // --------------------------------------
            // 1. ACTIVITY INFORMATION
            // --------------------------------------

            doc.fontSize(14).text("1. Activity Information");
            doc.moveDown(0.5);
            doc.fontSize(11);

            const infoRows = [
                ["Activity Name", get("activityName")],
                ["Coordinator", get("coordinator")],
                ["Date", get("activityDate")],
                ["Time", get("activityTime")],
                ["Venue", get("venue")],
                ["Participants", get("participants")],
                ["Nature of Activity", get("nature")],
                ["Type of Activity", get("activityType")],
                ["Schedule", get("schedule")],
                ["Funding Source", get("funding")],
                ["Amount", get("amount")],
                ["Chief Guest", get("chiefGuest")]
            ];

            infoRows.forEach(([label, value]) => {

                doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
                doc.font("Helvetica").text(value);

            });

            doc.moveDown();

            // --------------------------------------
            // 2. OBJECTIVES
            // --------------------------------------

            doc.fontSize(14).font("Helvetica-Bold").text("2. Objectives");
            doc.moveDown(0.3);
            doc.fontSize(11).font("Helvetica").text(get("objectives"));
            doc.moveDown();

            // --------------------------------------
            // 3. METHODOLOGY
            // --------------------------------------

            doc.fontSize(14).font("Helvetica-Bold").text("3. Methodology");
            doc.moveDown(0.3);
            doc.fontSize(11).font("Helvetica").text(get("methodology"));
            doc.moveDown();

            // --------------------------------------
            // 4. OUTCOMES
            // --------------------------------------

            doc.fontSize(14).font("Helvetica-Bold").text("4. Outcomes");
            doc.moveDown(0.3);
            doc.fontSize(11).font("Helvetica").text(get("outcomes"));
            doc.moveDown();

            // --------------------------------------
            // 5. SIGNATURES
            // --------------------------------------

            doc.fontSize(14).font("Helvetica-Bold").text("5. Signatures");
            doc.moveDown(0.5);
            doc.fontSize(11);

            doc.font("Helvetica-Bold").text("Coordinator: ", { continued: true });
            doc.font("Helvetica").text(get("signatureCoordinator"));

            doc.font("Helvetica-Bold").text("Head / Committee In-charge: ", { continued: true });
            doc.font("Helvetica").text(get("committeeHead"));

            doc.font("Helvetica-Bold").text("IQAC Coordinator: ", { continued: true });
            doc.font("Helvetica").text(get("iqacCoordinator"));

            doc.font("Helvetica-Bold").text("Principal: ", { continued: true });
            doc.font("Helvetica").text(get("principal"));

            doc.moveDown(2);

            doc
                .fontSize(9)
                .fillColor("#888888")
                .text(
                    `Generated using CampusLoop by ${req.session.user.full_name || "Teacher"}`,
                    { align: "center" }
                );

            doc.end();

        } catch (error) {

            console.error(
                "Generate report PDF error:",
                error
            );

            if (!res.headersSent) {

                res.status(500).json({
                    message: "Failed to generate report PDF"
                });

            } else {

                res.end();

            }

        }

    }
);


// ======================================================
// REPORT PAGE
// ======================================================

app.get(
    "/report",
    (req, res) => {

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.redirect(
                "/login"
            );

        }


        res.sendFile(
            path.join(
                __dirname,
                "views",
                "report.html"
            )
        );

    }
);


// ======================================================
// EVENT FILE UPLOAD
// ======================================================

app.post(
    "/upload-event-files",

    upload.fields([

        {
            name: "notice",
            maxCount: 1
        },

        {
            name: "brochure",
            maxCount: 1
        },

        {
            name: "attendance",
            maxCount: 1
        },

        {
            name: "photos",
            maxCount: 10
        },

        {
            name: "certificate",
            maxCount: 1
        }

    ]),

    (req, res) => {

        try {

            console.log(
                "================================"
            );


            console.log(
                "EVENT FILE UPLOAD"
            );


            console.log(
                "EVENT:",
                req.body.eventName
            );


            if (
                req.files
            ) {

                console.log(
                    "FILES:",
                    Object.keys(req.files)
                );

            }


            res.send(`

                <!DOCTYPE html>

                <html>

                <head>

                    <title>Upload Successful</title>

                    <style>

                        body {
                            font-family: Arial, sans-serif;
                            background: #f4f7ff;
                            text-align: center;
                            padding-top: 100px;
                        }

                        .box {
                            background: white;
                            width: 450px;
                            max-width: 90%;
                            margin: auto;
                            padding: 35px;
                            border-radius: 15px;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.10);
                        }

                        h2 {
                            color: #3155d9;
                        }

                        a {
                            display: inline-block;
                            margin-top: 20px;
                            padding: 10px 18px;
                            background: #3155d9;
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                        }

                    </style>

                </head>

                <body>

                    <div class="box">

                        <h2>
                            Files uploaded successfully! 🎉
                        </h2>

                        <p>
                            Event:
                            ${req.body.eventName || "Event"}
                        </p>

                        <p>
                            Your files have been saved.
                        </p>

                        <a href="/events">
                            Back to Events
                        </a>

                    </div>

                </body>

                </html>

            `);


        } catch (error) {

            console.error(
                "FILE UPLOAD ERROR:",
                error
            );


            res.status(500).send(
                "File upload failed."
            );

        }

    }
);


// ======================================================
// VIEW UPLOADED EVENT FILES
// ======================================================

app.get(
    "/api/event-files",
    (req, res) => {

        const eventName =
            req.query.eventName;


        // Check event name

        if (
            !eventName
        ) {

            return res.status(400).json({

                message:
                    "Event name is required"

            });

        }


        // Make safe event name

        const safeEventName =
            eventName
                .replace(
                    /[^a-z0-9]/gi,
                    "_"
                )
                .replace(
                    /_+/g,
                    "_"
                );


        // Read upload folder

        fs.readdir(
            uploadFolder,
            (err, files) => {

                if (err) {

                    console.error(
                        "READ FILE ERROR:",
                        err
                    );


                    return res.status(500).json({

                        message:
                            "Unable to read event files"

                    });

                }


                // Find files belonging
                // to selected event

                const eventFiles =
                    files.filter(
                        file =>
                            file.includes(
                                "_" +
                                safeEventName +
                                "_"
                            )
                    );


                res.json(
                    eventFiles
                );

            }
        );

    }
);


// ======================================================
// START SERVER
// ======================================================

const PORT = 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);