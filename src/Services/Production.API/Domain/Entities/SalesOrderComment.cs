using System;

namespace PJT_ERP.Production.Api.Domain.Entities;

public sealed class SalesOrderComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SalesOrderId { get; set; }
    public SalesOrder? SalesOrder { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public bool IsEdited { get; set; } = false;
    public bool IsDeleted { get; set; } = false;
}
