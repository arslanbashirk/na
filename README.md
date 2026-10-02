# Pakistan National Accounts Dashboard

ASP.NET MVC dashboard covering Pakistan national accounts, crop statistics and tax insights.

## Crop Atlas

- Overview, crop profiles, area profiles, rankings and animated ranking races.
- Leaflet maps, historical trends, regional comparisons, searchable tables and CSV export.
- Pakistan agriculture imagery, image-backed insights, responsive navigation and shared page styling.
- Admin-only source explorer and crop-selected CSV import with validation and preview.
- Uses `CropData`; yield is calculated as production divided by area. Missing inputs and zero area have no yield value.
- Karachi (990), Chitral (991) and Kohistan (992) remain combined reporting areas.

## Run locally

1. Install Visual Studio 2022 with ASP.NET/web development and the .NET Framework 4.7.2 targeting pack.
2. Open `NADashboard.sln` and restore NuGet packages.
3. Copy `ConnectionStrings.example.config` to `ConnectionStrings.local.config` and configure access to your SQL Server `NationalAccounts` database.
4. Build and run using IIS Express.

The database must match the EF model and provide the existing stored procedures used by the GDP and tax modules. Database records and private connection details are not included in this repository. Local configuration files are ignored by Git.

## Validation

The scripts under `Scripts/test_crop_*.py` run browser and live integration checks against IIS Express at `http://localhost:5187`. They require Python, Playwright and Chrome; adjust the local Playwright installation path if needed. Import checks validate previews and do not commit test records to the live database.

Generated illustrative banner assets and their prompts are documented in `Content/images/crop-page-imagery.json`. Third-party chart and map assets are documented in `Scripts/vendor/README.txt`.
