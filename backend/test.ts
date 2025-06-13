import axios from "axios";

async function testAPI() {
  const baseUrl = "http://localhost:3000";

  try {
    // 1. Add a document
    const documentResponse = await axios.post(`${baseUrl}/document`, {
      document: {
        id: "test-doc-001",
        pages: 50,
        processedDigitally: true,
        fileSizeMb: 1.5,
      },
      printParameters: {
        paperWeight: 5, // grams per page
        inkUsagePerPage: 0.04, // ml per page
        powerConsumptionPerPrint: 0.02, // kWh per page
      },
    });

    console.log("Document Added Response:", documentResponse.data);

    // 2. Generate carbon offsets and mint tokens
    const offsetResponse = await axios.post(`${baseUrl}/offsets/test-doc-001`, {
      pagesSaved: 50,
      userAddress: "0xe3406d4c242E1526082B1D1102bf9Ce9140a45F6",
    });

    console.log(
      "Offsets Generated and Tokens Minted Response:",
      offsetResponse.data
    );

    // 3. Get a detailed report for the specific document
    const documentReportResponse = await axios.get(
      `${baseUrl}/report/test-doc-001`
    );
    console.log("Document Report:", documentReportResponse.data.report);

    // 4. Get system-wide report
    const systemReportResponse = await axios.get(`${baseUrl}/system-report`);
    console.log("System-Wide Report:", systemReportResponse.data.report);
  } catch (error: any) {
    console.error(
      "Error during API testing:",
      error.response ? error.response.data : error.message
    );
  }
}

testAPI();
