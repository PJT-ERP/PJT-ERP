FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
ENV NUGET_XMLDOC_MODE=skip
COPY . .
RUN dotnet restore src/Services/Identity.API/Identity.API.csproj --disable-parallel -m:1
RUN dotnet publish src/Services/Identity.API/Identity.API.csproj -c Release -o /app/publish /p:UseAppHost=false --no-restore --disable-parallel -m:1

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Identity.API.dll"]
