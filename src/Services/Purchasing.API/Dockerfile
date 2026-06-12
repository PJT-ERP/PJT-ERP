FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
ENV NUGET_XMLDOC_MODE=skip
COPY . .
RUN dotnet restore src/Services/Purchasing.API/Purchasing.API.csproj --disable-parallel
RUN dotnet publish src/Services/Purchasing.API/Purchasing.API.csproj -c Release -o /app/publish /p:UseAppHost=false --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Purchasing.API.dll"]
