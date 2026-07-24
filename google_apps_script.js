/**
 * Google Apps Script (Web App) Code for Okta Landing Page
 * 
 * [단일 시트 탭 매칭 및 이메일 조회/로그인 아키텍처]
 * - "웨비나_등록_및_설문결과" 단일 시트 탭만 운용합니다.
 * 
 * 1. GET (doGet) - 이메일 조회 간이 로그인:
 *    - 이메일 파라미터가 유효한 등록자인지 시트에서 검색하여,
 *      이미 존재하면 사용자 정보(회사, 부서, 이름 등)를 리턴합니다.
 * 
 * 2. POST (doPost) - 데이터 적재 및 갱신:
 *    - register_info (최초 등록) 또는 submit_survey (설문 제출) 시
 *      이메일 기준으로 행을 생성하거나 기존 행에 설문 결과를 업데이트합니다.
 */

function doGet(e) {
  try {
    var action = e.parameter.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "Contact Information & Survey Result";
    var sheet = ss.getSheetByName(sheetName);

    if (action === "check_email") {
      var email = (e.parameter.email || "").trim().toLowerCase();
      if (!email) {
        return createJsonResponse({ "result": "error", "message": "Email parameter is required." });
      }

      if (!sheet) {
        return createJsonResponse({ "result": "not_found" });
      }

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return createJsonResponse({ "result": "not_found" });
      }

      var dataRange = sheet.getRange(2, 1, lastRow - 1, 7).getValues(); // 1열(시간)~7열(전화번호) 로드

      for (var i = 0; i < dataRange.length; i++) {
        var currentEmail = String(dataRange[i][5]).trim().toLowerCase(); // 6번째 열 (이메일, 인덱스 5)
        if (currentEmail === email) {
          // 이미 등록된 이메일 발견! 유저 데이터 반환
          return createJsonResponse({
            "result": "found",
            "user": {
              "company": dataRange[i][1],
              "department": dataRange[i][2],
              "jobTitle": dataRange[i][3],
              "name": dataRange[i][4],
              "phone": dataRange[i][6]
            }
          });
        }
      }

      return createJsonResponse({ "result": "not_found" });
    }

    // 기본 검증용 응답
    return createJsonResponse({
      "result": "success",
      "message": "Okta Webinar Single Sheet Merge API is running properly!"
    });

  } catch (error) {
    return createJsonResponse({ "result": "error", "message": error.toString() });
  }
}

function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "Contact Information & Survey Result";
    var sheet = ss.getSheetByName(sheetName);

    var headers = [
      "Timestamp",
      "Company",
      "Department",
      "JobTitle",
      "Name",
      "Email",
      "Phone",
      "Q1. Company Size",
      "Q2. AI Agent Permission & Security Management",
      "Q3. API Authentication & Permission Control Method",
      "Q4. Future Identity Security Solution Implementation Plan",
      "Q5. AI Tools & Non-Human Agent Account & Permission Management",
      "Q6. Requesting Visit Consultation for Okta AI Agent Security Solution"
    ];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);

      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#00297A");
      headerRange.setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    var lastRow = sheet.getLastRow();
    var dataRange = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
    var emailKey = (data.email || "").trim().toLowerCase();
    var targetRowIndex = -1;

    for (var i = 0; i < dataRange.length; i++) {
      var currentEmail = String(dataRange[i][5]).trim().toLowerCase();
      if (currentEmail === emailKey) {
        targetRowIndex = i + 2;
        break;
      }
    }

    var timestamp = data.timestamp || new Date().toISOString();

    if (data.action === "register_info") {
      if (targetRowIndex !== -1) {
        // 기존 회원이 다시 정보 등록할 경우 덮어쓰기
        sheet.getRange(targetRowIndex, 1).setValue(timestamp);
        sheet.getRange(targetRowIndex, 2).setValue(data.company);
        sheet.getRange(targetRowIndex, 3).setValue(data.department);
        sheet.getRange(targetRowIndex, 4).setValue(data.jobTitle);
        sheet.getRange(targetRowIndex, 5).setValue(data.name);
        sheet.getRange(targetRowIndex, 7).setValue(data.phone);
      } else {
        // 신규 회원 등록
        var newRow = [
          timestamp,
          data.company,
          data.department,
          data.jobTitle,
          data.name,
          data.email,
          data.phone,
          "", "", "", "", "", ""
        ];
        sheet.appendRow(newRow);
      }

      return createJsonResponse({ "result": "success", "message": "User registered successfully." });

    } else if (data.action === "submit_survey") {
      if (targetRowIndex !== -1) {
        // 이메일 매칭되는 행에 설문 업데이트
        sheet.getRange(targetRowIndex, 1).setValue(timestamp);
        sheet.getRange(targetRowIndex, 8).setValue(data.q1);
        sheet.getRange(targetRowIndex, 9).setValue(data.q2);
        sheet.getRange(targetRowIndex, 10).setValue(data.q3);
        sheet.getRange(targetRowIndex, 11).setValue(data.q4);
        sheet.getRange(targetRowIndex, 12).setValue(data.q5);
        sheet.getRange(targetRowIndex, 13).setValue(data.q6);
      } else {
        // 예외 상황: 매치 행 없을 시 신규 추가
        var fallbackRow = [
          timestamp,
          data.company,
          data.department,
          data.jobTitle,
          data.name,
          data.email,
          data.phone,
          data.q1,
          data.q2,
          data.q3,
          data.q4,
          data.q5,
          data.q6
        ];
        sheet.appendRow(fallbackRow);
      }

      return createJsonResponse({ "result": "success", "message": "Survey submitted successfully." });
    }

    return createJsonResponse({ "result": "error", "message": "Invalid action." });

  } catch (error) {
    return createJsonResponse({ "result": "error", "message": error.toString() });
  }
}

// JSONP/CORS 지원을 안전하게 반환하는 헬퍼 함수
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
