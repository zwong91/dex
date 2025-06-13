export interface Document {
  id: string;
  pages: number;
  processedDigitally: boolean;
  fileSizeMb: number; // File size in megabytes
}

export interface PrintParameters {
  paperWeight: number; // in grams per A4 sheet
  inkUsagePerPage: number; // in ml
  powerConsumptionPerPrint: number; // in kWh per page
}

export interface ProjectData {
  document: Document;
  printParameters: PrintParameters;
  alternativeScenarioEmissions: number; // kgCO2e per alternative (e.g., postal delivery)
  recentTransactions: any
}

export interface OffsetEvent {
  documentId: string;
  timestamp: Date;
  pagesSaved: number;
  offsetGenerated: number; // kgCO2e
}
