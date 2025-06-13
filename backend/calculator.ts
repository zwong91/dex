import { ethers } from "ethers";
import { ProjectData, OffsetEvent } from "./types";
import { v4 as uuidv4 } from "uuid";

// ABI of the CCToken contract
const CCTokenAbi = [
  "function mint(address to, uint256 amount) public",
  // Other contract methods...
];

export class PaperCarbonOffsetCalculator {
  private projectData: ProjectData;
  private totalPagesSaved: number = 0;
  private totalOffsetsGenerated: number = 0;
  private offsetHistory: OffsetEvent[] = [];
  private tokenContract: ethers.Contract;
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(
    projectData: ProjectData,
    providerUrl: string,
    contractAddress: string,
    signerPrivateKey: string
  ) {
    this.projectData = projectData;

    // Connect to the blockchain
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.signer = new ethers.Wallet(signerPrivateKey, this.provider);
    this.tokenContract = new ethers.Contract(
      contractAddress,
      CCTokenAbi,
      this.signer
    );
  }

  private calculatePaperEmissionsPerPage(): number {
    const paperEmissionsFactor = 0.001; // Example: 1kg of paper emits 1kgCO2e
    return this.projectData.printParameters.paperWeight * paperEmissionsFactor;
  }

  private calculateInkEmissionsPerPage(): number {
    const inkEmissionsFactor = 0.002; // Example: 1ml of ink emits 2g CO2e
    return (
      this.projectData.printParameters.inkUsagePerPage * inkEmissionsFactor
    );
  }

  private calculatePowerEmissionsPerPage(): number {
    const gridEmissionsFactor = 0.42; // kgCO2e/kWh
    return (
      this.projectData.printParameters.powerConsumptionPerPrint *
      gridEmissionsFactor
    );
  }

  public async calculateOffsetPerPage(): Promise<number> {
    const paperEmissions = this.calculatePaperEmissionsPerPage();
    const inkEmissions = this.calculateInkEmissionsPerPage();
    const powerEmissions = this.calculatePowerEmissionsPerPage();

    const totalPrintEmissions = paperEmissions + inkEmissions + powerEmissions;
    const alternativeEmissions = this.projectData.alternativeScenarioEmissions;

    return totalPrintEmissions - alternativeEmissions;
  }

  public async generateOffset(
    documentId: string,
    pagesSaved: number,
    userAddress: string
  ): Promise<OffsetEvent> {
    try {
      const offsetPerPage = await this.calculateOffsetPerPage();
      const newOffsets = offsetPerPage * pagesSaved * -1;

      this.totalPagesSaved += pagesSaved;
      this.totalOffsetsGenerated += newOffsets;

      // Call the mint function on the smart contract to reward the user
      const tokensToMint = ethers.parseUnits(newOffsets.toFixed(18), "ether");
      const res = await this.tokenContract.mint(userAddress, tokensToMint);
      console.log("mint function", res);

      const event: OffsetEvent = {
        documentId,
        timestamp: new Date(),
        pagesSaved,
        offsetGenerated: newOffsets,
      };

      this.offsetHistory.push(event);

      return event;
    } catch (error: any) {
      return error;
    }
  }

  public getOffsetHistory(): OffsetEvent[] {
    try {
      return this.offsetHistory;
    } catch (error: any) {
      return error;
    }
  }

  public generateReport(): string {
    try {
      const offsetId = uuidv4();
      const offsetPerPage = this.calculateOffsetPerPage();

      return `
      Offset ID: ${offsetId}
      Total Pages Saved: ${this.totalPagesSaved} pages
      Total Offsets Generated: ${this.totalOffsetsGenerated.toFixed(6)} kgCO2e
      Offset Generated per page: ${offsetPerPage} kgCO2e/page
    `;
    } catch (error: any) {
      return error;
    }
  }
}
