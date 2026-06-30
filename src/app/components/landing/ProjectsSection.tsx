import { useApp } from "../context/AppContext";

export function ProjectsSection() {
  const { landingPageContent } = useApp();
  const { projectsTitle, projectsSubtitle, projects } = landingPageContent;

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
            {projectsTitle}
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
            {projectsSubtitle}
          </h2>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects?.map((project) => (
            <div 
              key={project.id} 
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
