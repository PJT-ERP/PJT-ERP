FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src
ENV NUGET_XMLDOC_MODE=skip

# Copy project files for layer caching
COPY ["src/Services/QC.API/QC.API.csproj", "src/Services/QC.API/"]
COPY ["src/SharedLib/EventBus.Messages/EventBus.Messages.csproj", "src/SharedLib/EventBus.Messages/"]
COPY ["src/SharedLib/Shared.Auth/Shared.Auth.csproj", "src/SharedLib/Shared.Auth/"]
COPY ["src/SharedLib/Shared.Infrastructure/Shared.Infrastructure.csproj", "src/SharedLib/Shared.Infrastructure/"]
COPY ["src/SharedLib/Shared.Logging/Shared.Logging.csproj", "src/SharedLib/Shared.Logging/"]

RUN dotnet restore "src/Services/QC.API/QC.API.csproj" --disable-parallel

# Copy the rest of the source code
COPY . .

RUN dotnet publish "src/Services/QC.API/QC.API.csproj" -c Release -o /app/publish /p:UseAppHost=false --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "QC.API.dll"]
