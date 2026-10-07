const fs = require("fs");
const path = require("path");

const BASE_URL = process.argv[2] || process.env.TEST_URL || "http://127.0.0.1:5001";

async function runTests() {
  console.log("=== STARTING COMPREHENSIVE ATTACHMENT TESTS ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate user 1
    console.log("--- 1. Authenticating Primary User ---");
    const testUser1Email = `att_u1_${Date.now()}@testsuite.local`;
    const testUser2Email = `att_u2_${Date.now()}@testsuite.local`;

    await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Attachment Tester 1",
        email: testUser1Email,
        password: "Password@123",
        confirmPassword: "Password@123",
      }),
    });

    const loginRes = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser1Email,
        password: "Password@123",
      }),
    });
    const loginData = await loginRes.json();
    const token1 = loginData.token;
    assert(token1 && token1.length > 20, "User 1 authenticated and received JWT");

    // 2. Authenticate or Register user 2 for authorization testing
    console.log("\n--- 2. Setting Up Secondary User (For Security Checks) ---");
    await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Security Tester",
        email: testUser2Email,
        password: "Password@123",
        confirmPassword: "Password@123",
      }),
    });

    const loginRes2 = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser2Email,
        password: "Password@123",
      }),
    });
    const loginData2 = await loginRes2.json();
    const token2 = loginData2.token;
    assert(token2 && token2 !== token1, "User 2 authenticated for security verification");

    // 3. Test unauthenticated upload
    console.log("\n--- 3. Testing Security: Unauthenticated Upload ---");
    const unauthRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
    });
    assert(unauthRes.status === 401, `Unauthenticated upload rejected with 401 (got ${unauthRes.status})`);

    // 4. Test uploading unsupported / executable file (.exe)
    console.log("\n--- 4. Testing Security: Reject Executable Files ---");
    const exeForm = new FormData();
    exeForm.append(
      "files",
      new Blob(["MZ fake executable content"], { type: "application/x-msdownload" }),
      "malicious_tool.exe"
    );
    const exeRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
      body: exeForm,
    });
    assert(exeRes.status === 400, `Executable upload rejected with status 400 (got ${exeRes.status})`);

    // 5. Test uploading file exceeding 10 MB limit
    console.log("\n--- 5. Testing Limits: Reject Files Exceeding 10 MB ---");
    const hugeForm = new FormData();
    // 11 MB dummy buffer
    const hugeBlob = new Blob([new Uint8Array(11 * 1024 * 1024)], { type: "application/pdf" });
    hugeForm.append("files", hugeBlob, "oversized_lecture.pdf");
    const hugeRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
      body: hugeForm,
    });
    assert(hugeRes.status === 400, `Oversized file rejected with status 400 (got ${hugeRes.status})`);

    // 6. Test valid multi-file upload (PDF + Image) to /api/upload
    console.log("\n--- 6. Testing Valid Upload: PDF & PNG to /api/upload ---");
    const validForm = new FormData();
    const pdfBlob = new Blob(["%PDF-1.4 sample pdf content for minddesk"], { type: "application/pdf" });
    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const pngBlob = new Blob([pngBytes], { type: "image/png" });

    validForm.append("files", pdfBlob, "data_structures_notes.pdf");
    validForm.append("files", pngBlob, "binary_tree_diagram.png");

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
      body: validForm,
    });
    assert(uploadRes.status === 200, "Multi-file upload returned 200 OK");
    const uploadData = await uploadRes.json();
    assert(uploadData.attachments?.length === 2, `Uploaded 2 attachments successfully`);
    const [pdfAttachment, imgAttachment] = uploadData.attachments;
    assert(pdfAttachment.mimeType === "application/pdf", `PDF MIME detected as ${pdfAttachment.mimeType}`);
    assert(imgAttachment.mimeType === "image/png", `Image MIME detected as ${imgAttachment.mimeType}`);

    // 7. Create Note with attachments
    console.log("\n--- 7. Creating Note with Associated Attachments ---");
    const noteRes = await fetch(`${BASE_URL}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        title: "Advanced Data Structures & Algorithms",
        description: "Lecture notes and assignment references for Week 4.",
        category: "Computer Science",
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        userEmail: "minddesk43@gmail.com",
        attachments: [pdfAttachment, imgAttachment],
      }),
    });
    const createdNote = await noteRes.json();
    assert(createdNote._id, "Note created with ID: " + createdNote._id);
    assert(createdNote.attachments?.length === 2, "Note has 2 attachments saved in MongoDB");

    const savedPdfId = createdNote.attachments[0]._id;
    const savedImgId = createdNote.attachments[1]._id;

    // 8. Edit note without touching attachments
    console.log("\n--- 8. Testing Note Edit: Preserving Existing Attachments ---");
    const updateRes = await fetch(`${BASE_URL}/api/notes/${createdNote._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        title: "Advanced Data Structures & Algorithms (Updated)",
        description: "Updated lecture notes description.",
        category: "Computer Science",
      }),
    });
    const updatedNote = await updateRes.json();
    assert(
      updatedNote.attachments?.length === 2,
      `Attachments preserved on note edit (count: ${updatedNote.attachments?.length})`
    );

    // 9. Add another attachment directly to existing note via /api/notes/:id/attachments
    console.log("\n--- 9. Adding Another Attachment to Existing Note ---");
    const extraForm = new FormData();
    extraForm.append(
      "files",
      new Blob(["Assignment 4 Grading Rubric"], { type: "text/plain" }),
      "assignment_rubric.txt"
    );
    const addAttRes = await fetch(`${BASE_URL}/api/notes/${createdNote._id}/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
      body: extraForm,
    });
    assert(addAttRes.status === 200, "Direct note attachment returned 200 OK");
    const addAttData = await addAttRes.json();
    assert(addAttData.attachments?.length === 3, "Note now has 3 attachments in MongoDB");
    const extraAttId = addAttData.attachments[2]._id;

    // 10. Security: User 2 attempts to download or delete User 1's attachment
    console.log("\n--- 10. Testing Security: Access Control Between Users ---");
    const user2DlRes = await fetch(`${BASE_URL}/api/attachments/${savedPdfId}/download`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(user2DlRes.status === 403, `User 2 download blocked with 403 Forbidden (got ${user2DlRes.status})`);

    const user2DelRes = await fetch(
      `${BASE_URL}/api/notes/${createdNote._id}/attachments/${savedPdfId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token2}` },
      }
    );
    assert(user2DelRes.status === 403, `User 2 deletion blocked with 403 Forbidden (got ${user2DelRes.status})`);

    // 11. Authorized user downloads PDF
    console.log("\n--- 11. Testing Authenticated Download ---");
    const downloadRes = await fetch(`${BASE_URL}/api/attachments/${savedPdfId}/download`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(downloadRes.status === 200, "Authenticated download returned 200 OK");
    const cdHeader = downloadRes.headers.get("content-disposition");
    assert(cdHeader && cdHeader.includes("attachment"), "Content-Disposition header includes attachment");
    const downloadedBuffer = await downloadRes.arrayBuffer();
    assert(downloadedBuffer.byteLength > 0, `Downloaded file size: ${downloadedBuffer.byteLength} bytes`);

    // 12. Delete single attachment
    console.log("\n--- 12. Testing Individual Attachment Deletion ---");
    const deleteAttRes = await fetch(
      `${BASE_URL}/api/notes/${createdNote._id}/attachments/${extraAttId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token1}` },
      }
    );
    assert(deleteAttRes.status === 200, "Single attachment deletion returned 200 OK");
    const deleteAttData = await deleteAttRes.json();
    assert(deleteAttData.remainingCount === 2, "Remaining attachment count is 2");

    // 13. Task Attachment Tests
    console.log("\n--- 13. Testing Task (To-Do) Attachments ---");
    const todayStr = new Date().toISOString().split("T")[0];
    const todoRes = await fetch(`${BASE_URL}/api/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        task: "Review chapter 5 exercises",
        userEmail: "minddesk43@gmail.com",
        taskDate: todayStr,
      }),
    });
    const createdTodo = await todoRes.json();
    assert(createdTodo._id, "Created task with ID: " + createdTodo._id);

    const taskForm = new FormData();
    taskForm.append(
      "files",
      new Blob(["Reference exercise guide"], { type: "text/plain" }),
      "exercises.txt"
    );
    const taskAttRes = await fetch(`${BASE_URL}/api/todos/${createdTodo._id}/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token1}` },
      body: taskForm,
    });
    assert(taskAttRes.status === 200, "Task attachment upload returned 200 OK");
    const taskAttData = await taskAttRes.json();
    assert(taskAttData.attachments?.length === 1, "Task has 1 attachment attached");
    const taskAttId = taskAttData.attachments[0]._id;

    // Toggle todo status and confirm attachment remains
    const toggleRes = await fetch(`${BASE_URL}/api/todos/${createdTodo._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ completed: true }),
    });
    const toggledTodo = await toggleRes.json();
    assert(toggledTodo.completed === true, "Task marked as completed");

    const refreshTodosRes = await fetch(`${BASE_URL}/api/todos/minddesk43@gmail.com`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const allTodos = await refreshTodosRes.json();
    const foundTask = Array.isArray(allTodos) ? allTodos.find((t) => t._id === createdTodo._id) : null;
    assert(foundTask?.attachments?.length === 1, "Task attachments intact after completion toggle");

    // Delete task attachment
    const delTaskAttRes = await fetch(
      `${BASE_URL}/api/todos/${createdTodo._id}/attachments/${taskAttId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token1}` },
      }
    );
    assert(delTaskAttRes.status === 200, "Task attachment deleted successfully");

    // Clean up task
    await fetch(`${BASE_URL}/api/todos/${createdTodo._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token1}` },
    });

    // 14. Cascade deletion on Note Delete
    console.log("\n--- 14. Testing Note Cascade Deletion ---");
    const delNoteRes = await fetch(`${BASE_URL}/api/notes/${createdNote._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(delNoteRes.status === 200, "Note and its remaining attachments deleted with cascade cleanup");

    console.log("\n==========================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================");
  } catch (err) {
    console.error("FATAL TEST ERROR:", err);
    failed++;
  }
}

runTests();
