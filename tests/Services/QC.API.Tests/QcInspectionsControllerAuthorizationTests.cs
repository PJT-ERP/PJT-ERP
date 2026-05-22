using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using PJT_ERP.QC.Api.Controllers;

namespace QC.API.Tests;

public sealed class QcInspectionsControllerAuthorizationTests
{
    [Theory]
    [InlineData(nameof(QcInspectionsController.List), "Admin,Owner,Engineering Reviewer")]
    [InlineData(nameof(QcInspectionsController.Get), "Admin,Owner,Engineering Reviewer")]
    [InlineData(nameof(QcInspectionsController.UploadResult), "Admin,Engineering Reviewer")]
    public void Qc_actions_use_reviewer_roles(string actionName, string expectedRoles)
    {
        var method = typeof(QcInspectionsController)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Single(method => method.Name == actionName);

        var authorize = method.GetCustomAttributes<AuthorizeAttribute>().Single();

        Assert.Equal(expectedRoles, authorize.Roles);
        Assert.DoesNotContain("visual", actionName, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("dimension", actionName, StringComparison.OrdinalIgnoreCase);
    }
}
