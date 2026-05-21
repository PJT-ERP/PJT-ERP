using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace PJT_ERP.Shared.Auth;

public static class PjtAuthenticationSchemes
{
    public const string Bearer = JwtBearerDefaults.AuthenticationScheme;
}
