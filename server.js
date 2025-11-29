// Improvements:
// - If required ENV variables are missing, log clear errors and fail fast.
// - Nodemailer transporter now checks for proper Gmail credentials before creating.
// - Registration endpoint validates input and provides better error reporting if missing or invalid fields.
// - Detailed error message returned with mail failure.
// - Uses async/await for fs check.

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;

// ======= ENV CHECKS =======
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
if (!GMAIL_USER || !GMAIL_PASS) {
    console.error("Missing Gmail credentials in environment variables (GMAIL_USER and GMAIL_PASS).");
    process.exit(1);
}

// ======= CORS =======
app.use(cors({
    origin: "https://form1-bice.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());

// ======= Nodemailer Transporter =======
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
    }
});

// ======= PDF Course Paths =======
const pdfFolder = path.join(__dirname, 'pdfs');
const coursePDFs = {
    "Computer Science Engineering": path.join(pdfFolder, "CSE_Course.pdf"),
    "Mechanical Engineering": path.join(pdfFolder, "Mechanical_Course.pdf"),
    "Electrical Engineering": path.join(pdfFolder, "Electrical_Course.pdf"),
    "Civil Engineering": path.join(pdfFolder, "Civil_Course.pdf"),
    "Electronics and Communication": path.join(pdfFolder, "ECE_Course.pdf"),
    "Information Technology": path.join(pdfFolder, "IT_Course.pdf"),
    "Chemical Engineering": path.join(pdfFolder, "Chemical_Course.pdf"),
    "English Literature": path.join(pdfFolder, "English_Course.pdf"),
    "History": path.join(pdfFolder, "History_Course.pdf"),
    "Political Science": path.join(pdfFolder, "Political_Science_Course.pdf"),
    "Psychology": path.join(pdfFolder, "Psychology_Course.pdf"),
    "Sociology": path.join(pdfFolder, "Sociology_Course.pdf"),
    "Economics": path.join(pdfFolder, "Economics_Course.pdf"),
    "Fine Arts": path.join(pdfFolder, "Fine_Arts_Course.pdf")
};

// ======= VALIDATION UTILS =======
function isValidEmail(email) {
    // Simple regex; can be improved
    return typeof email === "string" && /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email);
}

function isValidSpecialization(spec) {
    return !!coursePDFs[spec];
}

app.post('/register', async (req, res) => {
    const { name, email, specialization } = req.body;

    // Basic field validation
    if (!name || typeof name !== 'string' || !email || !specialization) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields: name, email, specialization."
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email address."
        });
    }

    if (!isValidSpecialization(specialization)) {
        return res.status(400).json({
            success: false,
            message: `Invalid specialization: ${specialization}`
        });
    }

    const pdfPath = coursePDFs[specialization];

    try {
        await fs.access(pdfPath);

        await transporter.sendMail({
            from: GMAIL_USER,
            to: email,
            subject: `Course Information - ${specialization}`,
            html: `
                <h2>🎓 Registration Successful!</h2>
                <p>Hello <b>${name}</b>,</p>
                <p>Your course PDF is attached.</p>
                <p>Thanks,<br>Vijay</p>
            `,
            attachments: [
                {
                    filename: `${specialization.replace(/\s+/g, '_')}.pdf`,
                    path: pdfPath
                }
            ]
        });

        res.json({ success: true, message: "Email sent successfully!" });

    } catch (err) {
        // More informative error in response
        console.error("MAIL ERROR:", err);
        const notFound = err && err.code === 'ENOENT';
        res.status(notFound ? 404 : 500).json({
            success: false,
            message: notFound
                ? `PDF for ${specialization} not found.`
                : `Email send failed: ${err.message || 'Unknown error.'}`
        });
    }
});

// ======= Health Check =======
app.get('/', (req, res) => {
    res.send("API Running ✔");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
