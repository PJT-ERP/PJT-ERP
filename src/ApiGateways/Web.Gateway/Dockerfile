FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src
ENV NUGET_XMLDOC_MODE=skip

COPY ["src/ApiGateways/Web.Gateway/Web.Gateway.csproj", "src/ApiGateways/Web.Gateway/"]
COPY ["src/SharedLib/Shared.Logging/Shared.Logging.csproj", "src/SharedLib/Shared.Logging/"]

RUN dotnet restore "src/ApiGateways/Web.Gateway/Web.Gateway.csproj" --disable-parallel
COPY . .
RUN dotnet publish "src/ApiGateways/Web.Gateway/Web.Gateway.csproj" -c Release -o /app/publish /p:UseAppHost=false --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Web.Gateway.dll"]
