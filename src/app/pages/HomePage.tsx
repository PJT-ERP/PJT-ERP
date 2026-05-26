import "../../styles/fonts.css";
import { Navbar } from "../components/landing/Navbar";
import { HeroSection } from "../components/landing/HeroSection";
import { CompanyIntro } from "../components/landing/CompanyIntro";
import { ServicesSection } from "../components/landing/ServicesSection";
import { ManufacturingProcess } from "../components/landing/ManufacturingProcess";
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
