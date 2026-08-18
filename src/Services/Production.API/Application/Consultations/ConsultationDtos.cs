namespace PJT_ERP.Production.Api.Application.Consultations;

public class CreateConsultationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string ServiceDescription { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ConsultationDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string ServiceDescription { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class UpdateConsultationStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
