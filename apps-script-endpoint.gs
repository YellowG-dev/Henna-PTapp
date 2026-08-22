/**
 * PT App — submission endpoint
 *
 * Receives JSON from the intake questionnaire (and later, PT app backups),
 * appends it to this spreadsheet, and optionally emails it to you.
 *
 * SETUP: put your email address between the quotes below, then deploy.
 * Leave it empty ("") if you only want rows in the sheet, no email.
 */
const NOTIFY_EMAIL = "";

/**
 * NOTE ON CONTENT TYPE — do not "fix" this to application/json.
 * Apps Script only exposes doGet and doPost; it has no doOptions, so it
 * cannot answer a CORS preflight request and returns 405 Method Not Allowed.
 * Sending application/json triggers that preflight. text/plain is a
 * CORS-safelisted content type, so the browser skips preflight entirely.
 * The client therefore posts text/plain and we JSON.parse it here.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: "No data received" });
    }

    const body = JSON.parse(e.postData.contents);
    const person = String(body.person || "unknown").slice(0, 100);
    const kind = String(body.kind || "intake").slice(0, 40);
    const payload = body.payload !== undefined ? body.payload : body;
    let pretty = JSON.stringify(payload, null, 2);

    // A single Sheets cell holds max 50,000 characters. An intake form is
    // ~2-3 KB so this is far from binding today, but PT app backups grow
    // over time — truncate rather than fail silently if it ever gets there.
    const CELL_LIMIT = 49000;
    let truncated = false;
    if (pretty.length > CELL_LIMIT) {
      pretty = pretty.slice(0, CELL_LIMIT) + "\n...[TRUNCATED]";
      truncated = true;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Submissions");
    if (!sheet) {
      sheet = ss.insertSheet("Submissions");
      sheet.appendRow(["Received", "Person", "Type", "Data (JSON)"]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), person, kind, pretty]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "PT app — " + kind + " from " + person,
        body:
          person + " submitted their " + kind + ".\n\n" +
          (truncated ? "[NOTE: payload was truncated to fit the sheet]\n\n" : "") +
          pretty,
      });
    }

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

/** Lets you confirm the endpoint is live by opening the URL in a browser. */
function doGet() {
  return ContentService.createTextOutput("PT app endpoint is running.");
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
