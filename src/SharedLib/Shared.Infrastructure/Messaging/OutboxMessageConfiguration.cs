using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PJT_ERP.Shared.Infrastructure.Messaging;

public sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("outbox_messages");
        builder.HasKey(message => message.Id);
        builder.Property(message => message.Id).HasColumnName("id");
        builder.Property(message => message.Type).HasMaxLength(256).HasColumnName("type");
        builder.Property(message => message.Content).HasColumnType("jsonb").HasColumnName("content");
        builder.Property(message => message.OccurredAtUtc).HasColumnName("occurred_at_utc");
        builder.Property(message => message.ProcessedAtUtc).HasColumnName("processed_at_utc");
        builder.Property(message => message.Attempts).HasColumnName("attempts");
        builder.Property(message => message.Error).HasColumnName("error");
        builder.HasIndex(message => new { message.ProcessedAtUtc, message.OccurredAtUtc });
    }
}
