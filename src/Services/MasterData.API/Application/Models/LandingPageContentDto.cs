namespace PJT_ERP.MasterData.Api.Application.Models;

public class LandingPageContentDto
{
    public string TopBarCompanyName { get; set; } = "PT. PRATAMA JAYA TEKINDO";
    public string TopBarSubtitle { get; set; } = "General Supplier, Mechanical Component, Design Engineering, CNC 3D Programming, Jig & Checking Fixture, Fabrication, PLC Automation System";
    public string HeroHeadlineLine1 { get; set; } = "We are Mechanical";
    public string HeroHeadlineLine2 { get; set; } = "Engineering Experts!";
    public string HeroTagline { get; set; } = "Need Precision Components or Special Purpose Machines?";
    public string HeroBadgeText { get; set; } = "INTEGRATED MANUFACTURING SOLUTIONS";
    public string CompanyIntroTitle { get; set; } = "ABOUT COMPANY";
    public string CompanyIntroSubtitle { get; set; } = "Delivering Speed, Accuracy, and Innovation for the Future of Industry";
    public string CompanyIntroText1 { get; set; } = "Established in 2016 as a 100% local manufacturing company, PT Pratama Jaya Tekindo is here to answer the high industrial demand for reliable mechanical & engineering services. We focus on providing precision components and end-to-to-end engineering solutions to support the smooth operation of large-scale factories and production lines.";
    public string CompanyIntroText2 { get; set; } = "Upholding the work philosophy of Speed (fast processes with high quality) and Snipe (sharp level of accuracy and precision), we combine the expertise of professional workforce with modern CNC machining. From the automotive industry to food and beverage, we are committed to being a trusted partner capable of creating more effective, efficient, and competitive production systems.";
    public string ProjectsTitle { get; set; } = "Our Projects";
    public string ProjectsSubtitle { get; set; } = "Showcasing our precision engineering and successful manufacturing results.";
    public List<ProjectItemDto> Projects { get; set; } = new List<ProjectItemDto>
    {
        new ProjectItemDto { Id = "1", Title = "ROTARY JIG INSPECTION", Description = "We design and fabricate rotary jig inspection systems that ensure precision and consistency in production quality control processes.", Image = "/5.jpg" },
        new ProjectItemDto { Id = "2", Title = "CONVEYOR", Description = "Our conveyor systems are engineered for durability and seamless material handling, optimizing workflow efficiency across various industries.", Image = "/6.jpg" },
        new ProjectItemDto { Id = "3", Title = "PIPING INSTALATION", Description = "We offer complete piping installation services for industrial systems, ensuring safety, accuracy, and compliance with engineering standards.", Image = "/7.jpg" },
        new ProjectItemDto { Id = "4", Title = "MOLD BLOW", Description = "We produce high-quality blow molds designed for precision and long-term use, supporting various packaging and manufacturing applications.", Image = "/8.jpg" },
        new ProjectItemDto { Id = "5", Title = "JIG ROTATY ENGINEMESIN EKSAVATOR", Description = "We develop custom rotary jigs and components for heavy equipment such as excavators, enhancing accuracy, performance, and maintenance efficiency.", Image = "/9.jpg" },
        new ProjectItemDto { Id = "6", Title = "DIES CUTTING FARMASI", Description = "Our pharmaceutical die-cutting molds are engineered to meet industry standards, ensuring precision, hygiene, and consistent production quality.", Image = "/10.jpg" },
        new ProjectItemDto { Id = "7", Title = "Mesin Tapping", Description = "We manufacture reliable tapping machines that deliver accurate threading performance, ideal for both small-scale and industrial applications.", Image = "/11.jpg" },
        new ProjectItemDto { Id = "8", Title = "Insert mold", Description = "We design and produce insert molds with high precision to meet complex part geometries and improve manufacturing efficiency.", Image = "/12.jpg" },
        new ProjectItemDto { Id = "9", Title = "Special Purpose Mesin", Description = "Our custom-engineered special purpose machines are built to handle specific production needs, offering enhanced productivity and operational safety.", Image = "/13.png" },
        new ProjectItemDto { Id = "10", Title = "Proses CNC Milling", Description = "Our CNC milling services deliver precision machining for a wide range of materials, ensuring accuracy and high-quality surface finishing.", Image = "/14.jpg" },
        new ProjectItemDto { Id = "11", Title = "Checking Fixture", Description = "We design and produce checking fixtures that provide accurate measurements and quality assurance for manufactured components.", Image = "/15.png" },
        new ProjectItemDto { Id = "12", Title = "PLC SYSTEM WITH HMI", Description = "We integrate advanced PLC and HMI systems to automate and monitor industrial processes, ensuring seamless operation and real-time control.", Image = "/16.jpg" },
        new ProjectItemDto { Id = "13", Title = "PLC SYSTEM WITH HMI", Description = "We supply a wide range of industrial components, including electrical equipment, pneumatic parts, and hydraulic systems, from trusted brands to meet your operational needs.", Image = "/17.jpg" }
    };
    public string FacilitiesTitle { get; set; } = "Our Facilities & Capacities";
    public string FacilitiesSubtitle { get; set; } = "Expanding our reach to deliver excellence across regions.";
    public List<FacilityMachineItemDto> TangerangMachines { get; set; } = new List<FacilityMachineItemDto>
    {
        new FacilityMachineItemDto { Id = "t1", Desc = "CNC Milling Hurco 2014", Unit = 1, Img = "/tangerang/CNC Milling Hurco 2014.jpeg" },
        new FacilityMachineItemDto { Id = "t2", Desc = "CNC Milling Twinhorn 2021", Unit = 1, Img = "/tangerang/CNC Milling Twinhorn 2021.jpg" },
        new FacilityMachineItemDto { Id = "t3", Desc = "CNC Milling YCM 2022", Unit = 1, Img = "/tangerang/CNC Milling YCM 2022.jpg" },
        new FacilityMachineItemDto { Id = "t4", Desc = "CNC Milling Akira Seiki 2015", Unit = 1, Img = "/tangerang/CNC Milling Akira Seiki 2015.jpg" },
        new FacilityMachineItemDto { Id = "t5", Desc = "CNC Lathe M/C MAZAK 8 inch 2016", Unit = 3, Img = "/tangerang/CNC Lathe MC MAZAK 8 inch 2016.jpg" },
        new FacilityMachineItemDto { Id = "t6", Desc = "CNC LATHE M/C Goodway 8 inch 2016", Unit = 1, Img = "/tangerang/CNC LATHE MC Goodway 8 inch 2016.jpg" },
        new FacilityMachineItemDto { Id = "t7", Desc = "CNC LATHE M/C Microcut 6 inch 2016", Unit = 1, Img = "/tangerang/CNC LATHE MC Microcut 6 inch 2016.jpg" },
        new FacilityMachineItemDto { Id = "t8", Desc = "Lathe Machine", Unit = 1, Img = "/tangerang/Lathe Machine.jpg" },
        new FacilityMachineItemDto { Id = "t9", Desc = "Surface Grinding PROTH 2012", Unit = 1, Img = "/tangerang/Surface Grinding PROTH 2012.jpg" },
        new FacilityMachineItemDto { Id = "t10", Desc = "Milling Machine STD SM5", Unit = 1, Img = "/tangerang/Milling Machine STD SM5.jpg" },
        new FacilityMachineItemDto { Id = "t11", Desc = "Milling Machine STD SM4", Unit = 1, Img = "/tangerang/Milling Machine STD SM4.jpeg" }
    };
    public List<FacilityMachineItemDto> SurabayaMachines { get; set; } = new List<FacilityMachineItemDto>
    {
        new FacilityMachineItemDto { Id = "s1", Desc = "CNC Milling YCM 2015", Unit = 3, Img = "/surabaya/CNC Milling YCM 2015 NSV 106AM.jpg" },
        new FacilityMachineItemDto { Id = "s2", Desc = "CNC Milling YCM 2015", Unit = 1, Img = "/surabaya/CNC Milling YCM 2015 NSV 106AM.jpg" },
        new FacilityMachineItemDto { Id = "s3", Desc = "CNC Milling VICTOR 2018", Unit = 1, Img = "/surabaya/CNC Milling VICTOR 2018.jpg" },
        new FacilityMachineItemDto { Id = "s4", Desc = "CNC Milling First 2017", Unit = 1, Img = "/surabaya/CNC Milling First 2017.jpg" },
        new FacilityMachineItemDto { Id = "s5", Desc = "CNC Lathe M/C MAZAK 8 inch 2016", Unit = 2, Img = "/surabaya/CNC Lathe MC MAZAK 8 inch 2016.jpg" },
        new FacilityMachineItemDto { Id = "s6", Desc = "CNC LATHE M/C Goodway 8 inch 2016", Unit = 1, Img = "/surabaya/CNC LATHE MC Goodway 8 inch 2016.webp" },
        new FacilityMachineItemDto { Id = "s7", Desc = "CNC LATHE M/C Goodway 10 inch 2016", Unit = 1, Img = "/surabaya/CNC LATHE MC Goodway 10 inch 2016.jpg" },
        new FacilityMachineItemDto { Id = "s8", Desc = "HORIZONTAL MILLING", Unit = 1, Img = "/surabaya/HORIZONTAL MILLING.jpg" }
    };
    public string TestimonialsTitle { get; set; } = "Read what people are saying";
    public string TestimonialsSubtitle { get; set; } = "Feedback from our clients using our manufacturing services.";
    public List<TestimonialItemDto> Testimonials { get; set; } = new List<TestimonialItemDto>
    {
        new TestimonialItemDto { Id = "testi1", Name = "Jeniffer Smith", Text = "PT. PRATAMA JAYA TEKINDO provided us with high-quality, precision parts for our production line. Their expertise in custom manufacturing and commitment to deadlines truly sets them apart." },
        new TestimonialItemDto { Id = "testi2", Name = "David Johnson", Text = "We've relied on PT. PRATAMA JAYA TEKINDO for several special-purpose machines, and their technical support has been exceptional. Always responsive and professional." },
        new TestimonialItemDto { Id = "testi3", Name = "Steve Tailor", Text = "Their team's ability to deliver complex parts on time with the highest quality has greatly improved our production efficiency. Highly recommended for any engineering needs." }
    };
    public string ContactTitle { get; set; } = "Don't Know Where to Start?";
    public string ContactSubtitle { get; set; } = "Get Solutions for All Your Engineering Needs";
    public List<ContactLocationItemDto> ContactLocations { get; set; } = new List<ContactLocationItemDto>
    {
        new ContactLocationItemDto { Id = "loc1", Label = "Head Office", Address = "Sunrise Bizpark Blok D3, RT.003/RW.3, Gelam Jaya, Kec.\nPs. Kemis, Kabupaten Tangerang, Banten 15560" },
        new ContactLocationItemDto { Id = "loc2", Label = "Branch Office", Address = "Kawasan 3 bisnis centre,Ruko Shapire No 51 Jl. Lingkar\nTanjungpura, Tanjungpura, kec. Karawang Barat, Jawa Barat 41361" },
        new ContactLocationItemDto { Id = "loc3", Label = "Workshop 2", Address = "Pergudangan centre point Blok B5, Krian, Sidoarjo," }
    };
    public string FooterDescription { get; set; } = "PT PRATAMA JAYA TEKINDO serves the automation and engineering needs of top industries, providing custom machinery, precise parts, and ongoing maintenance to keep factories running.";
    public string FooterAddress { get; set; } = "Sunrise Bizpark Blok D3, Gelam Jaya, Tangerang 15560";
    public string FooterPhone { get; set; } = "(021) 5935 7380";
    public string FooterEmail { get; set; } = "marketing@innovation-pratama.co.id";
    public string FooterLinkedin { get; set; } = "https://linkedin.com/company/innovation-pratama";
    public bool ShowLinkedin { get; set; } = true;
    public string FooterTwitter { get; set; } = "https://twitter.com/innovationpratama";
    public bool ShowTwitter { get; set; } = true;
    public string FooterYoutube { get; set; } = "https://youtube.com/c/innovationpratama";
    public bool ShowYoutube { get; set; } = true;
    public string FooterInstagram { get; set; } = "https://instagram.com/innovationpratama";
    public bool ShowInstagram { get; set; } = true;
}

public class ProjectItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
}

public class FacilityMachineItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Desc { get; set; } = string.Empty;
    public int Unit { get; set; }
    public string Img { get; set; } = string.Empty;
}

public class TestimonialItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class ContactLocationItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
}
