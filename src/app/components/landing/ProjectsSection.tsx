const projects = [
  {
    title: "Custom Part Manufacturing",
    description: "We specialize in precision manufacturing of custom parts for various industries. From core pins to cavity machining, our solutions are tailored to meet specific requirements with high accuracy and efficiency.",
    image: "/1.png",
  },
  {
    title: "Special Purpose Machines",
    description: "We design and manufacture custom-built machines to improve production efficiency and meet unique operational challenges. Each unit is engineered for reliability, performance, and long-term value.",
    image: "/2.png",
  },
  {
    title: "Machine Installation & Service",
    description: "Our team provides professional installation, calibration, and maintenance for industrial machinery, ensuring smooth operation, reduced downtime, and extended equipment lifespan.",
    image: "/3.png",
  },
  {
    title: "General Trading",
    description: "We supply a broad selection of industrial components—from electrical and pneumatic systems to hydraulic parts—sourced from trusted global brands to support your operations.",
    image: "/4.png",
  },
  {
    title: "ROTARY JIG INSPECTION",
    description: "We design and fabricate rotary jig inspection systems that ensure precision and consistency in production quality control processes.",
    image: "/5.jpg",
  },
  {
    title: "CONVEYOR",
    description: "Our conveyor systems are engineered for durability and seamless material handling, optimizing workflow efficiency across various industries.",
    image: "/6.jpg",
  },
  {
    title: "PIPING INSTALATION",
    description: "We offer complete piping installation services for industrial systems, ensuring safety, accuracy, and compliance with engineering standards.",
    image: "/7.jpg",
  },
  {
    title: "MOLD BLOW",
    description: "We produce high-quality blow molds designed for precision and long-term use, supporting various packaging and manufacturing applications.",
    image: "/8.jpg",
  },
  {
    title: "JIG ROTATY ENGINEMESIN EKSAVATOR",
    description: "We develop custom rotary jigs and components for heavy equipment such as excavators, enhancing accuracy, performance, and maintenance efficiency.",
    image: "/9.jpg",
  },
  {
    title: "DIES CUTTING FARMASI",
    description: "Our pharmaceutical die-cutting molds are engineered to meet industry standards, ensuring precision, hygiene, and consistent production quality.",
    image: "/10.jpg",
  },
  {
    title: "Mesin Tapping",
    description: "We manufacture reliable tapping machines that deliver accurate threading performance, ideal for both small-scale and industrial applications.",
    image: "/11.jpg",
  },
  {
    title: "Insert mold",
    description: "We design and produce insert molds with high precision to meet complex part geometries and improve manufacturing efficiency.",
    image: "/12.jpg",
  },
  {
    title: "Special Purpose Mesin",
    description: "Our custom-engineered special purpose machines are built to handle specific production needs, offering enhanced productivity and operational safety.",
    image: "/13.png",
  },
  {
    title: "Proses CNC Milling",
    description: "Our CNC milling services deliver precision machining for a wide range of materials, ensuring accuracy and high-quality surface finishing.",
    image: "/14.jpg",
  },
  {
    title: "Checking Fixture",
    description: "We design and produce checking fixtures that provide accurate measurements and quality assurance for manufactured components.",
    image: "/15.png",
  },
  {
    title: "PLC SYSTEM WITH HMI",
    description: "We integrate advanced PLC and HMI systems to automate and monitor industrial processes, ensuring seamless operation and real-time control.",
    image: "/16.jpg",
  },
  {
    title: "PLC SYSTEM WITH HMI ",
    description: "We supply a wide range of industrial components, including electrical equipment, pneumatic parts, and hydraulic systems, from trusted brands to meet your operational needs.",
    image: "/17.jpg",
  },
];

export function ProjectsSection() {
  return (
    <section id="projects" style={{ backgroundColor: "#F8FAFC" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center md:text-left">
          <h3 
            style={{ 
              color: "#C8102E", 
              fontFamily: "Inter, sans-serif", 
              fontSize: "14px", 
              fontWeight: 700, 
              letterSpacing: "0.05em", 
              marginBottom: "12px" 
            }}
          >
            Our Projects
          </h3>
          <h2 
            style={{ 
              color: "#111827", 
              fontFamily: "Inter, sans-serif", 
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)", 
              fontWeight: 800, 
              lineHeight: 1.2,
              maxWidth: "800px"
            }}
          >
            Showcasing our precision engineering and successful manufacturing results.
          </h2>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.title} 
              className="flex flex-col bg-white overflow-hidden p-6"
              style={{
                border: "1px solid #E5E7EB",
              }}
            >
              <div className="w-full aspect-[4/3] mb-6 flex items-center justify-center bg-white">
                <img 
                  src={project.image} 
                  alt={project.title} 
                  className="max-w-full max-h-full object-contain" 
                />
              </div>
              <h3 
                style={{ 
                  color: "#111827", 
                  fontFamily: "Inter, sans-serif", 
                  fontSize: "18px", 
                  fontWeight: 800, 
                  marginBottom: "12px",
                  textTransform: "uppercase"
                }}
              >
                {project.title}
              </h3>
              <p 
                style={{ 
                  color: "#6B7280", 
                  fontFamily: "Inter, sans-serif", 
                  fontSize: "14px", 
                  lineHeight: 1.7 
                }}
              >
                {project.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
