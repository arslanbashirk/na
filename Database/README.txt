Crop categories

Run CropCategories.sql on the application database before deploying this change.
The script is transactional and repeatable, and preserves existing assignments.
The seed uses the existing PBS crop IDs; review those IDs for a different dataset.

CropCategories stores the category name and SVG icon key.
CropCategoryAssignments assigns a crop to one category. Its optional IconKey
can override the category icon, for example rice and maize within Grains.
A crop without an assignment is returned as Uncategorized with a neutral icon.
Categories are display metadata, not additional production or yield aggregates.

To recategorize a crop, update its CategoryKey in CropCategoryAssignments.
To categorize a new crop, insert its CropId and CategoryKey there.
Icon keys refer to Content/crop-icons.svg and must also be allowed by
Scripts/crop-category-icons.js. Never store markup or URLs as icon keys.
The Explore API reads assignments on every request, so edits appear on reload.
