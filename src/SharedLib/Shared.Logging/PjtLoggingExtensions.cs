using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Events;

namespace PJT_ERP.Shared.Logging;

public static class PjtLoggingExtensions
{
    public static WebApplicationBuilder AddPjtLogging(this WebApplicationBuilder builder)
    {
        var seqServerUrl = builder.Configuration["Seq:ServerUrl"];

        builder.Host.UseSerilog((context, loggerConfiguration) =>
        {
            loggerConfiguration
                .ReadFrom.Configuration(context.Configuration)
                .Enrich.FromLogContext()
                .Enrich.WithMachineName()
                .Enrich.WithEnvironmentName()
                .Enrich.WithProcessId()
                .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}");

            if (!string.IsNullOrWhiteSpace(seqServerUrl))
            {
                loggerConfiguration.WriteTo.Seq(seqServerUrl);
            }
        });

        return builder;
    }

    public static IApplicationBuilder UsePjtRequestLogging(this IApplicationBuilder app)
    {
        app.UseSerilogRequestLogging(options =>
        {
            options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
            options.GetLevel = (httpContext, elapsed, ex) =>
            {
                if (ex != null || httpContext.Response.StatusCode > 499)
                    return LogEventLevel.Error;

                if (httpContext.Response.StatusCode > 399)
                    return LogEventLevel.Warning;

                return LogEventLevel.Information;
            };
        });

        return app.Use(async (context, next) =>
        {
            try
            {
                await next();
            }
            catch (InvalidOperationException ex)
            {
                var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("PJT.GlobalExceptionHandler");
                logger.LogWarning(ex, "Business validation error: {Message}", ex.Message);

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
                }
            }
            catch (Exception ex)
            {
                var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("PJT.GlobalExceptionHandler");
                var traceId = context.TraceIdentifier;

                logger.LogError(ex, "Unhandled exception [{TraceId}]", traceId);

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new
                    {
                        error = "An internal server error occurred.",
                        traceId = traceId
                    }));
                }
            }
        });
    }
}
