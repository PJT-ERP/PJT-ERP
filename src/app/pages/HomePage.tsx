import "../../styles/fonts.css";
import { Navbar } from "../components/landing/Navbar";
import { HeroSection } from "../components/landing/HeroSection";
import { CompanyIntro } from "../components/landing/CompanyIntro";
import { OrganizationSection } from "../components/landing/OrganizationSection";
import { ServicesSection } from "../components/landing/ServicesSection";
import { ManufacturingProcess } from "../components/landing/ManufacturingProcess";
import { FacilitySection } from "../components/landing/FacilitySection";
import { ProjectsSection } from "../components/landing/ProjectsSection";
import { OrderTracking } from "../components/landing/OrderTracking";
import { WhyChooseUs } from "../components/landing/WhyChooseUs";
import { CompanyStats } from "../components/landing/CompanyStats";
import { ContactSection } from "../components/landing/ContactSection";
import { Footer } from "../components/landing/Footer";

export default function HomePage() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <HeroSection />
      <OrderTracking />
      <CompanyIntro />
      <OrganizationSection />
      <ServicesSection />
      <ManufacturingProcess />
      <ProjectsSection />
      <FacilitySection />
      <WhyChooseUs />
      <CompanyStats />
      <ContactSection />
      <Footer />
    </div>
  );
}
