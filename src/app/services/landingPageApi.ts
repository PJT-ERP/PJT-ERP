import apiClient from "./apiClient";
import { LandingPageContent } from "../components/context/AppContext";

export const landingPageApi = {
  async getLandingPageContent(): Promise<LandingPageContent | null> {
    try {
      const response = await apiClient.get<LandingPageContent>("/api/v1/content/landing-page");
      return response.data;
    } catch (error) {
      console.warn("Backend for landing page content not ready or failed. Falling back to local storage.", error);
      return null; // Return null to indicate fallback is needed
    }
  },

  async updateLandingPageContent(content: LandingPageContent): Promise<boolean> {
    try {
      await apiClient.put("/api/v1/content/landing-page", content);
      return true;
    } catch (error) {
      console.warn("Backend for landing page content not ready or failed. Simulating success using local storage.", error);
      return false; // Return false to indicate fallback is needed
    }
  }
};
