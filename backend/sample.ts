import axios from "axios";

async function main() {
  const baseUrl = "http://localhost:3000";

  // 1. Add a document to the system
  await axios.post(`${baseUrl}/document`, {
    document: {
      id: "loan-agreement-123",
      pages: 1000,
      processedDigitally: true,
      fileSizeMb: 4.5, // Example file size in MB
    },
    printParameters: {
      paperWeight: 5, // grams per page
      inkUsagePerPage: 0.05, // ml
      powerConsumptionPerPrint: 0.03, // kWh per page
    },
  });

  console.log("Document added successfully");

  // 2. Generate carbon offsets for the loan agreement document
  await axios.post(`${baseUrl}/offsets/loan-agreement-123`, {
    pagesSaved: 100,
  });

  console.log("Offsets generated successfully");

  // 3. Get a detailed report for the document
  const report = await axios.get(`${baseUrl}/report/loan-agreement-123`);
  console.log("Loan Agreement Offset Report:", report.data.report);

  // 4. Get a report for the entire system (fleet)
  const systemReport = await axios.get(`${baseUrl}/system-report`);
  console.log("System Report:", systemReport.data.report);
}

main().catch(console.error);
