import { NextResponse } from "next/server";

export async function GET() {
    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="PPTB" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Tool">
        <Key>
          <PropertyRef Name="PackageName" />
        </Key>
        <Property Name="PackageName" Type="Edm.String" Nullable="false" />
        <Property Name="Name" Type="Edm.String" Nullable="false" />
        <Property Name="Description" Type="Edm.String" />
        <Property Name="Version" Type="Edm.String" />
        <Property Name="License" Type="Edm.String" />
        <Property Name="ReadmeUrl" Type="Edm.String" />
        <Property Name="Website" Type="Edm.String" />
        <Property Name="Repository" Type="Edm.String" />
        <Property Name="MinAPI" Type="Edm.String" />
        <Property Name="MaxAPI" Type="Edm.String" />
        <Property Name="LastPublishedOn" Type="Edm.DateTimeOffset" />
        <Property Name="Downloads" Type="Edm.Int32" />
        <Property Name="Rating" Type="Edm.Decimal" />
        <Property Name="MAU" Type="Edm.Int32" />
        <Property Name="Categories" Type="Collection(Edm.String)" />
        <Property Name="Contributors" Type="Collection(Edm.String)" />
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Tools" EntityType="PPTB.Tool" />
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    return new NextResponse(metadata, {
        headers: {
            "Content-Type": "application/xml",
            "OData-Version": "4.0",
        },
    });
}
