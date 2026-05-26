import "../../styles/fonts.css";
import { Navbar } from "../components/Navbar";
import { HeroSection } from "../components/HeroSection";
import { CompanyIntro } from "../components/CompanyIntro";
import { ServicesSection } from "../components/ServicesSection";
import { ManufacturingProcess } from "../components/ManufacturingProcess";
import { OrderTracking } from "../components/OrderTracking";
import { WhyChooseUs } from "../components/WhyChooseUs";
import { CompanyStats } from "../components/CompanyStats";
import { ContactSection } from "../components/ContactSection";
import { Footer } from "../components/Footer";

export default function HomePage() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <HeroSection />
      <CompanyIntro />
      <ServicesSection />
      <ManufacturingProcess />
      <OrderTracking />
      <WhyChooseUs />
      <CompanyStats />
      <ContactSection />
      <Footer />
    </div>
  );
}
