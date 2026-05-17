using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using PJT_HIMTIKA.QC.Api.Controllers;

namespace QC.API.Tests;

public sealed class QcInspectionsControllerAuthorizationTests
{
    public static TheoryData<string> OwnerOnlyActions => new()
    {
        nameof(QcInspectionsController.List),
        nameof(QcInspectionsController.Get),
        nameof(QcInspectionsController.Scan),
        nameof(QcInspectionsController.Start),
        nameof(QcInspectionsController.AddVisualCheck),
        nameof(QcInspectionsController.AddDimensionCheck),
        nameof(QcInspectionsController.UploadForm),
        nameof(QcInspectionsController.Submit),
        nameof(QcInspectionsController.Review)
    };

    [Theory]
    [MemberData(nameof(OwnerOnlyActions))]
    public void Qc_actions_are_restricted_to_owner_or_admin(string actionName)
    {
        var method = typeof(QcInspectionsController)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Single(method => method.Name == actionName);

        var authorize = method.GetCustomAttributes<AuthorizeAttribute>().Single();

        Assert.Equal("Admin,Owner", authorize.Roles);
        Assert.DoesNotContain("Engineering", authorize.Roles);
    }
}
