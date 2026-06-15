const services = [
  {
    image: "/service-new-1.jpg",
    title: "Custom Part Manufacturing",
    description: "We specialize in precision manufacturing of custom parts for various industries. From core pins to cavity machining, our solutions are tailored to meet specific requirements with high accuracy and efficiency.",
  },
  {
    image: "/service-new-2.jpg",
    title: "Special Purpose Machines",
    description: "We design and manufacture special-purpose machines that enhance production processes. Our machines are engineered to provide optimal performance, increasing efficiency and reducing operational costs.",
  },
  {
    image: "/service-new-3.png",
    title: "Machine Installation & Service",
    description: "We offer installation and maintenance services for mechanical equipment and machinery, ensuring your operations run smoothly and with minimal downtime.",
  },
  {
    image: "/service-new-4.jpg",
    title: "General Trading",
    description: "We supply a wide range of industrial components, including electrical equipment, pneumatic parts, and hydraulic systems, from trusted brands to meet your operational needs.",
  },
];

export function ServicesSection() {
  return (
    <section id="services" style={{ backgroundColor: "#1F1F1F" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h3 
            style={{ 
              color: "#D93A4A", 
              fontFamily: "Inter, sans-serif", 
              fontSize: "14px", 
              fontWeight: 700, 
              letterSpacing: "0.05em", 
              marginBottom: "12px" 
            }}
          >
            Our Services
          </h3>
          <h2 
            style={{ 
              color: "#FFFFFF", 
              fontFamily: "Inter, sans-serif", 
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)", 
              fontWeight: 800, 
              lineHeight: 1.2 
            }}
          >
            We Provide Comprehensive Mechanical Engineering Solutions
          </h2>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-12">
          {services.map((service) => (
            <div key={service.title} className="flex flex-col group">
              <div className="w-full aspect-[4/3] md:aspect-[16/10] overflow-hidden mb-5">
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
              </div>
              <h3 
                style={{ 
                  color: "#FFFFFF", 
                  fontFamily: "Inter, sans-serif", 
                  fontSize: "18px", 
                  fontWeight: 800, 
                  marginBottom: "10px" 
                }}
              >
                {service.title}
              </h3>
              <p 
                style={{ 
                  color: "#D1D5DB", 
                  fontFamily: "Inter, sans-serif", 
                  fontSize: "14px", 
                  lineHeight: 1.7 
                }}
              >
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
