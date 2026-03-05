import { NextResponse } from "next/server";

export async function GET() {
    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="PPTB" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Tool">
        <Key>
          <PropertyRef Name="Name" />
        </Key>
        <Property Name="Name" Type="Edm.String" Nullable="false" />
        <Property Name="Description" Type="Edm.String" />
        <Property Name="Icon" Type="Edm.String" />
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
