-- Run before deploying the category-aware Explore API. Safe to run repeatedly.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.CropCategories','U') IS NULL
CREATE TABLE dbo.CropCategories (
    CategoryKey varchar(32) NOT NULL PRIMARY KEY,
    Name nvarchar(80) NOT NULL,
    IconKey varchar(32) NOT NULL
);
IF OBJECT_ID('dbo.CropCategoryAssignments','U') IS NULL
CREATE TABLE dbo.CropCategoryAssignments (
    CropId int NOT NULL PRIMARY KEY REFERENCES dbo.Crops(id),
    CategoryKey varchar(32) NOT NULL REFERENCES dbo.CropCategories(CategoryKey),
    IconKey varchar(32) NULL
);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='grains')
INSERT dbo.CropCategories VALUES ('grains',N'Grains','wheat');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=1) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=1)
INSERT dbo.CropCategoryAssignments VALUES (1,'grains','maize');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=2) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=2)
INSERT dbo.CropCategoryAssignments VALUES (2,'grains','rice');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=4) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=4)
INSERT dbo.CropCategoryAssignments VALUES (4,'grains',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=19) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=19)
INSERT dbo.CropCategoryAssignments VALUES (19,'grains',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=20) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=20)
INSERT dbo.CropCategoryAssignments VALUES (20,'grains',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=21) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=21)
INSERT dbo.CropCategoryAssignments VALUES (21,'grains',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='vegetables')
INSERT dbo.CropCategories VALUES ('vegetables',N'Vegetables','vegetable');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=6) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=6)
INSERT dbo.CropCategoryAssignments VALUES (6,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=7) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=7)
INSERT dbo.CropCategoryAssignments VALUES (7,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=8) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=8)
INSERT dbo.CropCategoryAssignments VALUES (8,'vegetables','potato');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=47) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=47)
INSERT dbo.CropCategoryAssignments VALUES (47,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=48) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=48)
INSERT dbo.CropCategoryAssignments VALUES (48,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=49) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=49)
INSERT dbo.CropCategoryAssignments VALUES (49,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=50) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=50)
INSERT dbo.CropCategoryAssignments VALUES (50,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=51) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=51)
INSERT dbo.CropCategoryAssignments VALUES (51,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=52) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=52)
INSERT dbo.CropCategoryAssignments VALUES (52,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=53) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=53)
INSERT dbo.CropCategoryAssignments VALUES (53,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=54) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=54)
INSERT dbo.CropCategoryAssignments VALUES (54,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=59) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=59)
INSERT dbo.CropCategoryAssignments VALUES (59,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=97) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=97)
INSERT dbo.CropCategoryAssignments VALUES (97,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=98) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=98)
INSERT dbo.CropCategoryAssignments VALUES (98,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=99) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=99)
INSERT dbo.CropCategoryAssignments VALUES (99,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=101) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=101)
INSERT dbo.CropCategoryAssignments VALUES (101,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=102) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=102)
INSERT dbo.CropCategoryAssignments VALUES (102,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=103) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=103)
INSERT dbo.CropCategoryAssignments VALUES (103,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=105) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=105)
INSERT dbo.CropCategoryAssignments VALUES (105,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=106) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=106)
INSERT dbo.CropCategoryAssignments VALUES (106,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=108) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=108)
INSERT dbo.CropCategoryAssignments VALUES (108,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=109) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=109)
INSERT dbo.CropCategoryAssignments VALUES (109,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=110) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=110)
INSERT dbo.CropCategoryAssignments VALUES (110,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=111) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=111)
INSERT dbo.CropCategoryAssignments VALUES (111,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=112) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=112)
INSERT dbo.CropCategoryAssignments VALUES (112,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=113) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=113)
INSERT dbo.CropCategoryAssignments VALUES (113,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=115) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=115)
INSERT dbo.CropCategoryAssignments VALUES (115,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=116) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=116)
INSERT dbo.CropCategoryAssignments VALUES (116,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=118) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=118)
INSERT dbo.CropCategoryAssignments VALUES (118,'vegetables','potato');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=119) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=119)
INSERT dbo.CropCategoryAssignments VALUES (119,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=122) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=122)
INSERT dbo.CropCategoryAssignments VALUES (122,'vegetables',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=123) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=123)
INSERT dbo.CropCategoryAssignments VALUES (123,'vegetables','potato');
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='fruits')
INSERT dbo.CropCategories VALUES ('fruits',N'Fruits','fruit');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=41) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=41)
INSERT dbo.CropCategoryAssignments VALUES (41,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=42) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=42)
INSERT dbo.CropCategoryAssignments VALUES (42,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=43) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=43)
INSERT dbo.CropCategoryAssignments VALUES (43,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=44) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=44)
INSERT dbo.CropCategoryAssignments VALUES (44,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=45) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=45)
INSERT dbo.CropCategoryAssignments VALUES (45,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=46) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=46)
INSERT dbo.CropCategoryAssignments VALUES (46,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=57) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=57)
INSERT dbo.CropCategoryAssignments VALUES (57,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=58) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=58)
INSERT dbo.CropCategoryAssignments VALUES (58,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=60) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=60)
INSERT dbo.CropCategoryAssignments VALUES (60,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=61) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=61)
INSERT dbo.CropCategoryAssignments VALUES (61,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=63) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=63)
INSERT dbo.CropCategoryAssignments VALUES (63,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=64) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=64)
INSERT dbo.CropCategoryAssignments VALUES (64,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=65) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=65)
INSERT dbo.CropCategoryAssignments VALUES (65,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=66) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=66)
INSERT dbo.CropCategoryAssignments VALUES (66,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=67) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=67)
INSERT dbo.CropCategoryAssignments VALUES (67,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=68) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=68)
INSERT dbo.CropCategoryAssignments VALUES (68,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=69) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=69)
INSERT dbo.CropCategoryAssignments VALUES (69,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=70) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=70)
INSERT dbo.CropCategoryAssignments VALUES (70,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=71) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=71)
INSERT dbo.CropCategoryAssignments VALUES (71,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=72) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=72)
INSERT dbo.CropCategoryAssignments VALUES (72,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=73) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=73)
INSERT dbo.CropCategoryAssignments VALUES (73,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=74) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=74)
INSERT dbo.CropCategoryAssignments VALUES (74,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=75) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=75)
INSERT dbo.CropCategoryAssignments VALUES (75,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=84) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=84)
INSERT dbo.CropCategoryAssignments VALUES (84,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=85) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=85)
INSERT dbo.CropCategoryAssignments VALUES (85,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=86) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=86)
INSERT dbo.CropCategoryAssignments VALUES (86,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=87) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=87)
INSERT dbo.CropCategoryAssignments VALUES (87,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=88) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=88)
INSERT dbo.CropCategoryAssignments VALUES (88,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=89) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=89)
INSERT dbo.CropCategoryAssignments VALUES (89,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=90) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=90)
INSERT dbo.CropCategoryAssignments VALUES (90,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=91) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=91)
INSERT dbo.CropCategoryAssignments VALUES (91,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=92) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=92)
INSERT dbo.CropCategoryAssignments VALUES (92,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=93) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=93)
INSERT dbo.CropCategoryAssignments VALUES (93,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=94) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=94)
INSERT dbo.CropCategoryAssignments VALUES (94,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=96) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=96)
INSERT dbo.CropCategoryAssignments VALUES (96,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=120) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=120)
INSERT dbo.CropCategoryAssignments VALUES (120,'fruits',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=121) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=121)
INSERT dbo.CropCategoryAssignments VALUES (121,'fruits',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='pulses')
INSERT dbo.CropCategories VALUES ('pulses',N'Pulses','pulse');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=12) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=12)
INSERT dbo.CropCategoryAssignments VALUES (12,'pulses',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=13) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=13)
INSERT dbo.CropCategoryAssignments VALUES (13,'pulses',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=14) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=14)
INSERT dbo.CropCategoryAssignments VALUES (14,'pulses',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=15) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=15)
INSERT dbo.CropCategoryAssignments VALUES (15,'pulses',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=16) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=16)
INSERT dbo.CropCategoryAssignments VALUES (16,'pulses',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=17) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=17)
INSERT dbo.CropCategoryAssignments VALUES (17,'pulses',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=18) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=18)
INSERT dbo.CropCategoryAssignments VALUES (18,'pulses',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='oilseeds')
INSERT dbo.CropCategories VALUES ('oilseeds',N'Oilseeds','oilseed');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=22) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=22)
INSERT dbo.CropCategoryAssignments VALUES (22,'oilseeds',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=23) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=23)
INSERT dbo.CropCategoryAssignments VALUES (23,'oilseeds',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=24) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=24)
INSERT dbo.CropCategoryAssignments VALUES (24,'oilseeds',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=25) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=25)
INSERT dbo.CropCategoryAssignments VALUES (25,'oilseeds',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=26) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=26)
INSERT dbo.CropCategoryAssignments VALUES (26,'oilseeds',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=27) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=27)
INSERT dbo.CropCategoryAssignments VALUES (27,'oilseeds',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=28) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=28)
INSERT dbo.CropCategoryAssignments VALUES (28,'oilseeds',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=29) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=29)
INSERT dbo.CropCategoryAssignments VALUES (29,'oilseeds',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=31) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=31)
INSERT dbo.CropCategoryAssignments VALUES (31,'oilseeds',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='fibres')
INSERT dbo.CropCategories VALUES ('fibres',N'Fibre crops','cotton');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=5) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=5)
INSERT dbo.CropCategoryAssignments VALUES (5,'fibres',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=34) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=34)
INSERT dbo.CropCategoryAssignments VALUES (34,'fibres',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=36) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=36)
INSERT dbo.CropCategoryAssignments VALUES (36,'fibres',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='sugar')
INSERT dbo.CropCategories VALUES ('sugar',N'Sugar crops','cane');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=3) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=3)
INSERT dbo.CropCategoryAssignments VALUES (3,'sugar',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=30) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=30)
INSERT dbo.CropCategoryAssignments VALUES (30,'sugar',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=117) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=117)
INSERT dbo.CropCategoryAssignments VALUES (117,'sugar',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='spices')
INSERT dbo.CropCategories VALUES ('spices',N'Spices and condiments','spice');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=9) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=9)
INSERT dbo.CropCategoryAssignments VALUES (9,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=10) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=10)
INSERT dbo.CropCategoryAssignments VALUES (10,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=11) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=11)
INSERT dbo.CropCategoryAssignments VALUES (11,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=33) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=33)
INSERT dbo.CropCategoryAssignments VALUES (33,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=35) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=35)
INSERT dbo.CropCategoryAssignments VALUES (35,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=38) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=38)
INSERT dbo.CropCategoryAssignments VALUES (38,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=55) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=55)
INSERT dbo.CropCategoryAssignments VALUES (55,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=76) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=76)
INSERT dbo.CropCategoryAssignments VALUES (76,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=77) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=77)
INSERT dbo.CropCategoryAssignments VALUES (77,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=78) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=78)
INSERT dbo.CropCategoryAssignments VALUES (78,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=79) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=79)
INSERT dbo.CropCategoryAssignments VALUES (79,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=80) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=80)
INSERT dbo.CropCategoryAssignments VALUES (80,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=81) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=81)
INSERT dbo.CropCategoryAssignments VALUES (81,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=82) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=82)
INSERT dbo.CropCategoryAssignments VALUES (82,'spices',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=83) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=83)
INSERT dbo.CropCategoryAssignments VALUES (83,'spices',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='fodder')
INSERT dbo.CropCategories VALUES ('fodder',N'Fodder','fodder');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=37) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=37)
INSERT dbo.CropCategoryAssignments VALUES (37,'fodder',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=39) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=39)
INSERT dbo.CropCategoryAssignments VALUES (39,'fodder',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=40) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=40)
INSERT dbo.CropCategoryAssignments VALUES (40,'fodder',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=100) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=100)
INSERT dbo.CropCategoryAssignments VALUES (100,'fodder',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=104) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=104)
INSERT dbo.CropCategoryAssignments VALUES (104,'fodder',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=107) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=107)
INSERT dbo.CropCategoryAssignments VALUES (107,'fodder',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=114) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=114)
INSERT dbo.CropCategoryAssignments VALUES (114,'fodder',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='nuts')
INSERT dbo.CropCategories VALUES ('nuts',N'Nuts','nut');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=56) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=56)
INSERT dbo.CropCategoryAssignments VALUES (56,'nuts',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=62) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=62)
INSERT dbo.CropCategoryAssignments VALUES (62,'nuts',NULL);
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=95) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=95)
INSERT dbo.CropCategoryAssignments VALUES (95,'nuts',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='other')
INSERT dbo.CropCategories VALUES ('other',N'Other crops','shell-sprout');
IF EXISTS (SELECT 1 FROM dbo.Crops WHERE id=32) AND NOT EXISTS (SELECT 1 FROM dbo.CropCategoryAssignments WHERE CropId=32)
INSERT dbo.CropCategoryAssignments VALUES (32,'other',NULL);
IF NOT EXISTS (SELECT 1 FROM dbo.CropCategories WHERE CategoryKey='uncategorized')
INSERT dbo.CropCategories VALUES ('uncategorized',N'Uncategorized','shell-sprout');
COMMIT TRANSACTION;
-- Maintain assignments by CropId; IconKey overrides the category icon when appropriate.
