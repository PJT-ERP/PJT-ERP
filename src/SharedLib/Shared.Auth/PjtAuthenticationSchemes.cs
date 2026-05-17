using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace PJT_ERP.Shared.Auth;

public static class PjtAuthenticationSchemes
{
    public const string Smart = "PjtSmart";
    public const string DevMasterToken = "DevMasterToken";
    public const string DevMasterTokenHeaderName = "X-Dev-Master-Token";
    public const string Bearer = JwtBearerDefaults.AuthenticationScheme;
}
