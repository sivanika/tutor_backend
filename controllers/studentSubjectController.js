import StudentSubject from "../models/StudentSubject.js";
import User from "../models/User.js";

// GET /api/student-subjects
export const getStudentSubjects = async (req, res) => {
  try {
    const subjects = await StudentSubject.find({ student: req.user._id })
      .populate("requests.professor", "name rating hourlyRate profilePhoto headline");
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching subjects", error: err.message });
  }
};

// POST /api/student-subjects
export const addSubject = async (req, res) => {
  try {
    const { subjectId, name, icon } = req.body;
    
    // Check if subject already added
    const existing = await StudentSubject.findOne({ student: req.user._id, subjectId });
    if (existing) {
      return res.status(400).json({ message: "Subject already added" });
    }

    const newSubject = new StudentSubject({
      student: req.user._id,
      subjectId,
      name,
      icon,
      status: "Open",
      visible: true
    });

    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (err) {
    res.status(500).json({ message: "Error adding subject", error: err.message });
  }
};

// PATCH /api/student-subjects/:id/visibility
export const updateSubjectVisibility = async (req, res) => {
  try {
    const { visible } = req.body;
    const subject = await StudentSubject.findOneAndUpdate(
      { _id: req.params.id, student: req.user._id },
      { visible },
      { new: true }
    );
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: "Error updating visibility", error: err.message });
  }
};

// PUT /api/student-subjects/:id/requirement
export const updateRequirement = async (req, res) => {
  try {
    const { topic, description, time, budget } = req.body;
    const subject = await StudentSubject.findOne({ _id: req.params.id, student: req.user._id });
    
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    subject.requirement = { topic, description, time, budget };
    
    // Auto promote to Pending if it's currently Open
    if (subject.status === "Open") {
      subject.status = "Pending";
    }

    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: "Error updating requirement", error: err.message });
  }
};

// DELETE /api/student-subjects/:id
export const deleteSubject = async (req, res) => {
  try {
    const subject = await StudentSubject.findOneAndDelete({ _id: req.params.id, student: req.user._id });
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json({ message: "Subject deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting subject", error: err.message });
  }
};

// POST /api/student-subjects/:id/requests/:requestId/accept
export const acceptProfessorRequest = async (req, res) => {
  try {
    const subject = await StudentSubject.findOne({ _id: req.params.id, student: req.user._id });
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const request = subject.requests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Mark request as accepted
    request.status = "accepted";
    
    // Reject other pending requests
    subject.requests.forEach(req => {
      if (req.status === "pending") req.status = "rejected";
    });

    // Update subject status
    subject.status = "Engaged";
    subject.visible = false;

    await subject.save();

    // Socket notification could go here
    if (global.io) {
      global.io.emit("notification", {
        userId: request.professor,
        message: `Your request for ${subject.name} has been accepted!`
      });
    }

    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: "Error accepting request", error: err.message });
  }
};

// POST /api/student-subjects/:id/requests/:requestId/reject
export const rejectProfessorRequest = async (req, res) => {
  try {
    const subject = await StudentSubject.findOne({ _id: req.params.id, student: req.user._id });
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const request = subject.requests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "rejected";
    await subject.save();

    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: "Error rejecting request", error: err.message });
  }
};

// POST /api/student-subjects/:id/simulate-request
export const simulateRequest = async (req, res) => {
  try {
    const subject = await StudentSubject.findOne({ _id: req.params.id, student: req.user._id });
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    // Find a professor to use as a mock
    const professor = await User.findOne({ role: "professor" });
    if (!professor) return res.status(404).json({ message: "No professors found in system" });

    // Check if professor already applied
    const exists = subject.requests.some(r => r.professor.toString() === professor._id.toString());
    if (exists) return res.status(400).json({ message: "Professor already applied" });

    subject.requests.push({
      professor: professor._id,
      status: "pending"
    });

    await subject.save();

    // Re-populate and return
    const updated = await StudentSubject.findById(subject._id).populate("requests.professor", "name rating headline");
    
    // Notify student via socket
    if (global.io) {
      global.io.emit("notification", {
        userId: req.user._id,
        message: `New professor application for ${subject.name}!`
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error simulating request", error: err.message });
  }
};

// POST /api/student-subjects/:id/apply (Professor only)
export const applyToSubject = async (req, res) => {
  try {
    const subject = await StudentSubject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject request not found" });

    // Check if user is professor
    if (req.user.role !== "professor") {
      return res.status(403).json({ message: "Only professors can apply to subjects" });
    }

    // Check if professor already applied
    const exists = subject.requests.some(r => r.professor.toString() === req.user._id.toString());
    if (exists) {
      return res.status(400).json({ message: "You have already applied to this subject" });
    }

    subject.requests.push({
      professor: req.user._id,
      status: "pending"
    });

    await subject.save();

    // Notify student via socket
    if (global.io) {
      global.io.emit("notification", {
        userId: subject.student, 
        message: `A professor has applied for your ${subject.name} request!`
      });
    }

    res.json({ message: "Applied successfully", subject });
  } catch (err) {
    res.status(500).json({ message: "Error applying to subject", error: err.message });
  }
};


