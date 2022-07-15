/*
  This is a collection of the functions I use most in App Script
  This collection can be added in the files section of your Apps Script dashboard and referenced within your code 
*/

//Works with the importSheetData function to convert an array imported from a sheet to a JSON object 
const getJsonArrayFromSheetData = (data) => {
  let headers = data[0];
  let columns = headers.length;
  return data.slice(1).map((data) => {
    let obj = {};
    for (let i = 0; i < columns; i += 1) {
      obj[headers[i]] = data[i];
    }
    return obj;
  });
};

//Calculate the last row in a sheet
const calculateLastRow = (sheet) => {
  //If sheet is empty,leave a row for the headers
  let lastRow = sheet.getLastRow();
  return !lastRow ? 2 : lastRow + 1;
};

//Prepare an object for outputting to a sheet
const createOutputRowsFromObject = (obj, headings) => {
  let outputRows = [];
  obj.forEach((data) => {
    outputRows.push(
      headings.map((heading) => {
        return data[heading] || "";
      })
    );
  });
  outputRows.unshift(headings);
  return outputRows;
};

//Bring in sheet data and convert to a JSON array
const importSheetData = (sheet_name) => {
  let spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name);
  let values = spreadsheet.getDataRange().getValues();
  let data = values.map(function (firstArray) {
    return firstArray.map(function (val) {
      let str = val.toString();
      return str.trim();
    });
  });
  return getJsonArrayFromSheetData(data);
};

//Output data to a sheet, using calculatLastRow to get the final row in the sheet
const outputToSheet = (rows, sheet_name) => {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name);
  sheet.clear();
  sheet
    .getRange(calculateLastRow(sheet_name) + 1, 1, rows.length, rows[0].length)
    .setValues(rows);
};

//Convert unix time to YYYY-MM-DD
const convertUnixTime = (unixTime) => {
const date = new Date(unixTime*1000);
return date.toISOString().split("T");
}
