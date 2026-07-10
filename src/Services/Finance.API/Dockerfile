FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
ENV NUGET_XMLDOC_MODE=skip
COPY . .
RUN dotnet restore "src/Services/Finance.API/Finance.API.csproj" --disable-parallel -m:1
RUN dotnet publish "src/Services/Finance.API/Finance.API.csproj" -c Release -o /app/publish /p:UseAppHost=false --no-restore --disable-parallel -m:1

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Finance.API.dll"]
