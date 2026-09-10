// ==========================================
// CAMPUSLOOP ACTIVITY REPORT
// ==========================================


// ==========================================
// GET INPUT VALUE
// ==========================================

function getValue(id) {

    const element = document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value.trim();
}


// ==========================================
// HEADER IMAGE PREVIEW
// ==========================================

const headerImageInput =
    document.getElementById("headerImage");

if (headerImageInput) {

    headerImageInput.addEventListener("change", function () {

        const file = this.files[0];

        const preview =
            document.getElementById("headerPreview");

        if (!file || !preview) {
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {

            preview.src = event.target.result;

            preview.style.display = "block";

        };

        reader.readAsDataURL(file);

    });

}


// ==========================================
// SHOW SELECTED FILE NAME
// ==========================================

function showFileName(inputId, outputId) {

    const input =
        document.getElementById(inputId);

    const output =
        document.getElementById(outputId);

    if (!input || !output) {
        return;
    }

    input.addEventListener("change", function () {

        if (this.files.length > 0) {

            output.textContent =
                "Selected file: " + this.files[0].name;

        } else {

            output.textContent = "";

        }

    });

}


showFileName("notice", "noticeName");
showFileName("brochure", "brochureName");
showFileName("attendance", "attendanceName");
showFileName("certificate", "certificateName");


// ==========================================
// EVENT PHOTO PREVIEW
// ==========================================

const eventPhotosInput =
    document.getElementById("eventPhotos");

if (eventPhotosInput) {

    eventPhotosInput.addEventListener("change", function () {

        const preview =
            document.getElementById("photoPreview");

        if (!preview) {
            return;
        }

        preview.innerHTML = "";

        Array.from(this.files).forEach(function (file) {

            if (!file.type.startsWith("image/")) {
                return;
            }

            const reader = new FileReader();

            reader.onload = function (event) {

                const img =
                    document.createElement("img");

                img.src = event.target.result;

                img.style.width = "120px";
                img.style.height = "90px";
                img.style.objectFit = "cover";
                img.style.borderRadius = "8px";
                img.style.margin = "5px";

                preview.appendChild(img);

            };

            reader.readAsDataURL(file);

        });

    });

}


// ==========================================
// GENERATE REPORT
// ==========================================

function generateReport() {

    const report =
        document.getElementById("reportPreview");

    if (!report) {

        alert("Report preview not found.");

        return;

    }


    // ======================================
    // GET ALL FORM DATA
    // ======================================

    const collegeName =
        getValue("collegeName") || "Not provided";

    const department =
        getValue("department") || "Not provided";

    const academicYear =
        getValue("academicYear") || "Not provided";

    const documentNumber =
        getValue("documentNumber") || "Not provided";

    const activityName =
        getValue("activityName") || "Not provided";

    const coordinator =
        getValue("coordinator") || "Not provided";

    const activityDate =
        getValue("activityDate") || "Not provided";

    const activityTime =
        getValue("activityTime") || "Not provided";

    const venue =
        getValue("venue") || "Not provided";

    const participants =
        getValue("participants") || "Not provided";

    const nature =
        getValue("nature") || "Not provided";

    const activityType =
        getValue("activityType") || "Not provided";

    const schedule =
        getValue("schedule") || "Not provided";

    const funding =
        getValue("funding") || "Not provided";

    const amount =
        getValue("amount") || "Not provided";

    const chiefGuest =
        getValue("chiefGuest") || "Not provided";

    const objectives =
        getValue("objectives") || "Not provided";

    const methodology =
        getValue("methodology") || "Not provided";

    const outcomes =
        getValue("outcomes") || "Not provided";

    const signatureCoordinator =
        getValue("signatureCoordinator") || "Not provided";

    const committeeHead =
        getValue("committeeHead") || "Not provided";

    const iqacCoordinator =
        getValue("iqacCoordinator") || "Not provided";

    const principal =
        getValue("principal") || "Not provided";


    // ======================================
    // CREATE REPORT HTML
    // ======================================

    report.innerHTML = `

        <div class="report-content">

            <div class="report-header">

                <h1>
                    ${collegeName}
                </h1>

                <h2>
                    ${department}
                </h2>

                <p>
                    Academic Year: ${academicYear}
                </p>

                <p>
                    IQAC / Document No:
                    ${documentNumber}
                </p>

            </div>


            <hr>


            <h1 class="report-title">
                ACTIVITY REPORT
            </h1>


            <h2>
                1. Activity Information
            </h2>


            <table class="report-table">

                <tr>
                    <th>Activity Name</th>
                    <td>${activityName}</td>
                </tr>

                <tr>
                    <th>Coordinator</th>
                    <td>${coordinator}</td>
                </tr>

                <tr>
                    <th>Date</th>
                    <td>${activityDate}</td>
                </tr>

                <tr>
                    <th>Time</th>
                    <td>${activityTime}</td>
                </tr>

                <tr>
                    <th>Venue</th>
                    <td>${venue}</td>
                </tr>

                <tr>
                    <th>Participants</th>
                    <td>${participants}</td>
                </tr>

                <tr>
                    <th>Nature of Activity</th>
                    <td>${nature}</td>
                </tr>

                <tr>
                    <th>Type of Activity</th>
                    <td>${activityType}</td>
                </tr>

                <tr>
                    <th>Schedule</th>
                    <td>${schedule}</td>
                </tr>

                <tr>
                    <th>Funding Source</th>
                    <td>${funding}</td>
                </tr>

                <tr>
                    <th>Amount</th>
                    <td>${amount}</td>
                </tr>

                <tr>
                    <th>Chief Guest</th>
                    <td>${chiefGuest}</td>
                </tr>

            </table>


            <h2>
                2. Objectives
            </h2>

            <p class="report-text">
                ${objectives}
            </p>


            <h2>
                3. Methodology
            </h2>

            <p class="report-text">
                ${methodology}
            </p>


            <h2>
                4. Outcomes
            </h2>

            <p class="report-text">
                ${outcomes}
            </p>


            <h2>
                5. Signatures
            </h2>


            <table class="signature-table">

                <tr>

                    <td>
                        <strong>Coordinator</strong>
                        <br><br>
                        ${signatureCoordinator}
                    </td>

                    <td>
                        <strong>Head / Committee In-charge</strong>
                        <br><br>
                        ${committeeHead}
                    </td>

                </tr>

                <tr>

                    <td>
                        <strong>IQAC Coordinator</strong>
                        <br><br>
                        ${iqacCoordinator}
                    </td>

                    <td>
                        <strong>Principal</strong>
                        <br><br>
                        ${principal}
                    </td>

                </tr>

            </table>


            <div class="report-footer">

                Generated using CampusLoop

            </div>

        </div>

    `;


    // ======================================
    // SHOW REPORT
    // ======================================

    report.style.display = "block";
    report.style.visibility = "visible";
    report.style.opacity = "1";


    // ======================================
    // WAIT FOR REPORT TO RENDER
    // ======================================

    setTimeout(function () {

        report.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);


    // ======================================
    // DOWNLOAD PDF
    // ======================================

    setTimeout(function () {

        downloadPDF();

    }, 1500);

}


// ==========================================
// DOWNLOAD PDF (server-generated, via PDFKit)
// ==========================================
// Previously this used html2pdf.js + html2canvas in the
// browser, which depended on a CDN library and canvas
// rendering and was producing blank PDFs. It now posts
// the same form fields to the server, which builds a
// real PDF with PDFKit and streams it back for download.

async function downloadPDF() {

    const report =
        document.getElementById("reportPreview");

    if (!report) {

        alert("Report preview not found.");

        return;

    }


    if (report.innerHTML.trim() === "") {

        alert(
            "Report is empty. Please generate the report first."
        );

        return;

    }


    const button =
        document.querySelector(".buttons button[onclick=\"generateReport()\"]");

    const originalButtonText =
        button ? button.textContent : null;

    if (button) {

        button.disabled = true;
        button.textContent = "Generating PDF...";

    }


    // ======================================
    // OPTIONAL HEADER IMAGE (base64)
    // ======================================

    const headerPreview =
        document.getElementById("headerPreview");

    const headerImage =
        (headerPreview && headerPreview.src && headerPreview.style.display !== "none")
            ? headerPreview.src
            : "";


    // ======================================
    // COLLECT ALL FORM FIELDS
    // ======================================

    const payload = {

        headerImage: headerImage,

        collegeName: getValue("collegeName"),
        department: getValue("department"),
        academicYear: getValue("academicYear"),
        documentNumber: getValue("documentNumber"),

        activityName: getValue("activityName"),
        coordinator: getValue("coordinator"),
        activityDate: getValue("activityDate"),
        activityTime: getValue("activityTime"),
        venue: getValue("venue"),
        participants: getValue("participants"),
        nature: getValue("nature"),
        activityType: getValue("activityType"),
        schedule: getValue("schedule"),
        funding: getValue("funding"),
        amount: getValue("amount"),
        chiefGuest: getValue("chiefGuest"),

        objectives: getValue("objectives"),
        methodology: getValue("methodology"),
        outcomes: getValue("outcomes"),

        signatureCoordinator: getValue("signatureCoordinator"),
        committeeHead: getValue("committeeHead"),
        iqacCoordinator: getValue("iqacCoordinator"),
        principal: getValue("principal")

    };


    // ======================================
    // FILE NAME (fallback, server also sets one)
    // ======================================

    const activityName =
        getValue("activityName") ||
        "CampusLoop_Activity";

    const fileName =
        activityName
            .replace(/[^a-z0-9]/gi, "_")
            .replace(/_+/g, "_") +
        "_Report.pdf";


    // ======================================
    // REQUEST PDF FROM SERVER
    // ======================================

    try {

        const response =
            await fetch("/generate-report", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)

            });

        if (!response.ok) {

            let message = "PDF generation failed.";

            try {

                const errorData = await response.json();

                if (errorData && errorData.message) {
                    message = errorData.message;
                }

            } catch (parseError) {

                // response wasn't JSON, keep default message

            }

            throw new Error(message);

        }

        const blob = await response.blob();

        const downloadUrl =
            window.URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = downloadUrl;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(downloadUrl);

        console.log("PDF downloaded successfully.");

    } catch (error) {

        console.error(
            "PDF ERROR:",
            error
        );

        alert(
            "PDF generation failed: " + error.message
        );

    } finally {

        if (button) {

            button.disabled = false;
            button.textContent = originalButtonText;

        }

    }

}


// ==========================================
// CLEAR FORM / PREVIEW
// ==========================================

function clearPreview() {

    const report =
        document.getElementById("reportPreview");

    if (report) {

        report.innerHTML = "";

        report.style.display = "none";

    }

}