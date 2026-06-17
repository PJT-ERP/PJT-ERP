using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using PJT_ERP.QC.Api.Controllers;

namespace QC.API.Tests;

public sealed class QcInspectionsControllerAuthorizationTests
{
    [Theory]
    [InlineData(nameof(QcInspectionsController.List), "Admin,Owner,Engineering Supervisor", true)]
    [InlineData(nameof(QcInspectionsController.Get), "Admin,Owner,Engineering Supervisor", true)]
    [InlineData(nameof(QcInspectionsController.UploadResult), "Admin,Engineering Supervisor", false)]
    public void Qc_actions_use_supervisor_roles(string actionName, string expectedRoles, bool ownerAllowed)
    {
        var method = typeof(QcInspectionsController)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Single(method => method.Name == actionName);

        var authorize = method.GetCustomAttributes<AuthorizeAttribute>().Single();

        Assert.Equal(expectedRoles, authorize.Roles);
        if (ownerAllowed)
        {
            Assert.Contains("Owner", authorize.Roles);
        }
        else
        {
            Assert.DoesNotContain("Owner", authorize.Roles);
        }
        Assert.DoesNotContain("Engineering Reviewer", authorize.Roles);
        Assert.DoesNotContain("visual", actionName, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("dimension", actionName, StringComparison.OrdinalIgnoreCase);
    }
}
