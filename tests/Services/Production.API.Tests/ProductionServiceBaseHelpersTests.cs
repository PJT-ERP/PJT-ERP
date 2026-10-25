using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Application.Production;

namespace Production.API.Tests
{
    public class TestProductionServiceBase : ProductionServiceBase
    {
        public TestProductionServiceBase(
            PJT_ERP.Production.Api.Infrastructure.Persistence.ProductionContext db, 
            PJT_ERP.Shared.Infrastructure.Messaging.IEventPublisher eventPublisher,
            IMasterDataClient masterDataClient) 
            : base(db, eventPublisher, masterDataClient)
        {
        }

        public static IReadOnlyCollection<SalesOrderMaterialDto>? TestMapMaterials(SalesOrder order, IReadOnlyCollection<BomStockDto>? boms)
        {
            return MapMaterials(order, boms);
        }
    }

    public class ProductionServiceBaseHelpersTests
    {
        [Fact]
        public void MapMaterials_WhenNoCustomBom_ShouldUseMasterBom()
        {
            // Arrange
            var productId = Guid.NewGuid();
            var salesOrder = new SalesOrder
            {
                Id = Guid.NewGuid(),
                Items = new List<SalesOrderItem>
                {
                    new SalesOrderItem
                    {
                        Id = Guid.NewGuid(),
                        ProductId = productId,
                        Qty = 2
                    }
                }
            };

            var boms = new List<BomStockDto>
            {
                new BomStockDto(
                    productId,
                    "PROD-01",
                    "Product 01",
                    new List<BomStockItemDto>
                    {
                        new BomStockItemDto(
                            Guid.NewGuid(),
                            Guid.NewGuid(),
                            "INV-01",
                            "Steel",
                            5, // BomQuantity
                            "kg",
                            null,
                            100,
                            ""
                        )
                    }
                )
            };

            // Act
            var result = TestProductionServiceBase.TestMapMaterials(salesOrder, boms);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result);
            var material = result.First();
            Assert.Equal("Steel", material.Name);
            Assert.Equal(5, material.Quantity);
            Assert.False(material.IsCustomerMaterial);
        }

        [Fact]
        public void MapMaterials_WithCustomBom_MissingFields_ShouldParseSafelyAndIgnoreMasterBom()
        {
            // Arrange
            var productId = Guid.NewGuid();
            var inventoryItemId = Guid.NewGuid();
            var salesOrder = new SalesOrder
            {
                Id = Guid.NewGuid(),
                Items = new List<SalesOrderItem>
                {
                    new SalesOrderItem
                    {
                        Id = Guid.NewGuid(),
                        ProductId = productId,
                        Qty = 2,
                        // Weird specific scenario JSON: missing id, missing code/spec, quantity is string, isCustomerMaterial is true
                        Notes = @"[{""name"":""Customer Paint"",""quantity"":""11"",""unit"":""pcs"",""isCustomerMaterial"":true,""inventoryItemId"":""""}]"
                    }
                }
            };

            // Master BOM has a different item that should be COMPLETELY ignored because a custom BOM exists
            var boms = new List<BomStockDto>
            {
                new BomStockDto(
                    productId,
                    "PROD-01",
                    "Product 01",
                    new List<BomStockItemDto>
                    {
                        new BomStockItemDto(
                            Guid.NewGuid(),
                            inventoryItemId,
                            "INV-MASTER",
                            "Master Paint",
                            10,
                            "pcs",
                            null,
                            50,
                            ""
                        )
                    }
                )
            };

            // Act
            var result = TestProductionServiceBase.TestMapMaterials(salesOrder, boms);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result); // Should NOT merge with Master BOM
            
            var customMaterial = result.First();
            Assert.Equal("Customer Paint", customMaterial.Name);
            Assert.Equal(11, customMaterial.Quantity);
            Assert.Equal("pcs", customMaterial.Unit);
            Assert.True(customMaterial.IsCustomerMaterial);
            Assert.Null(customMaterial.Code);
            Assert.Null(customMaterial.Spec);
            Assert.Equal("", customMaterial.InventoryItemId); // Empty string parsed as null or "" -> the TryGetProperty handled it
        }

        [Fact]
        public void MapMaterials_MultipleCustomBoms_ShouldAggregateCorrectly()
        {
            // Arrange
            var salesOrder = new SalesOrder
            {
                Id = Guid.NewGuid(),
                Items = new List<SalesOrderItem>
                {
                    new SalesOrderItem
                    {
                        Id = Guid.NewGuid(),
                        ProductId = Guid.NewGuid(),
                        Notes = @"[{""inventoryItemId"":""inv-1"",""name"":""Wood"",""quantity"":5,""unit"":""m""}]"
                    },
                    new SalesOrderItem
                    {
                        Id = Guid.NewGuid(),
                        ProductId = Guid.NewGuid(),
                        Notes = @"[{""inventoryItemId"":""inv-1"",""name"":""Wood"",""quantity"":10,""unit"":""m""}]"
                    }
                }
            };

            // Act
            var result = TestProductionServiceBase.TestMapMaterials(salesOrder, null);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result); // Same inventory item ID should aggregate
            
            var material = result.First();
            Assert.Equal("Wood", material.Name);
            Assert.Equal(15, material.Quantity);
        }
    }
}
