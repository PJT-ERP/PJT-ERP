using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace PJT_ERP.Shared.Logging;

public static class PjtLoggingExtensions
{
    public static WebApplicationBuilder AddPjtLogging(this WebApplicationBuilder builder)
    {
        builder.Logging.ClearProviders();
        builder.Logging.AddSimpleConsole(options =>
        {
            options.SingleLine = true;
            options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
        });

        return builder;
    }

    public static IApplicationBuilder UsePjtRequestLogging(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("PJT.Requests");
            var startedAt = Stopwatch.GetTimestamp();

            try
            {
                await next();

                var elapsed = Stopwatch.GetElapsedTime(startedAt);
                var safePath = SanitizeLogPath(context.Request.Path, context.Request.QueryString);
                logger.LogInformation(
                    "{Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                    context.Request.Method,
                    safePath,
                    context.Response.StatusCode,
                    elapsed.TotalMilliseconds.ToString("0.0"));
            }
            catch (InvalidOperationException ex)
            {
                var elapsed = Stopwatch.GetElapsedTime(startedAt);
                var safePath = SanitizeLogPath(context.Request.Path, context.Request.QueryString);
                logger.LogWarning(ex,
                    "Business validation error during {Method} {Path} ({ElapsedMs}ms): {Message}",
                    context.Request.Method,
                    safePath,
                    elapsed.TotalMilliseconds.ToString("0.0"),
                    ex.Message);

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
                }
            }
            catch (Exception ex)
            {
                var elapsed = Stopwatch.GetElapsedTime(startedAt);
                var safePath = SanitizeLogPath(context.Request.Path, context.Request.QueryString);
                var traceId = context.TraceIdentifier;

                logger.LogError(ex,
                    "Unhandled exception during {Method} {Path} [{TraceId}] ({ElapsedMs}ms)",
                    context.Request.Method,
                    safePath,
                    traceId,
                    elapsed.TotalMilliseconds.ToString("0.0"));

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

    private static string SanitizeLogPath(PathString path, QueryString query)
    {
        if (!query.HasValue || string.IsNullOrEmpty(query.Value))
        {
            return path.ToString();
        }

        var queryString = query.Value;
        if (queryString.Contains("token=", StringComparison.OrdinalIgnoreCase) ||
            queryString.Contains("key=", StringComparison.OrdinalIgnoreCase) ||
            queryString.Contains("password=", StringComparison.OrdinalIgnoreCase) ||
            queryString.Contains("secret=", StringComparison.OrdinalIgnoreCase) ||
            queryString.Contains("auth=", StringComparison.OrdinalIgnoreCase))
        {
            return $"{path}?[REDACTED_SENSITIVE_QUERY]";
        }

        return $"{path}{queryString}";
    }
}
