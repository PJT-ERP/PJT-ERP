using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace PJT_HIMTIKA.Shared.Logging;

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

            await next();

            var elapsed = Stopwatch.GetElapsedTime(startedAt);
            logger.LogInformation(
                "{Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                elapsed.TotalMilliseconds.ToString("0.0"));
        });
    }
}
