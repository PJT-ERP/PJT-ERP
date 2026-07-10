FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
ENV NUGET_XMLDOC_MODE=skip
COPY . .
RUN dotnet restore src/ApiGateways/Web.Gateway/Web.Gateway.csproj --disable-parallel -m:1
RUN dotnet publish src/ApiGateways/Web.Gateway/Web.Gateway.csproj -c Release -o /app/publish /p:UseAppHost=false --no-restore --disable-parallel -m:1

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Web.Gateway.dll"]
