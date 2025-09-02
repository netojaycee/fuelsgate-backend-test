# Nigerian States and LGAs - Sample Excel Structure for Transport Fare Distance Upload

## How to Prepare Your Excel File for Bulk Upload

### Column Structure:
| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| State | LGA | LoadPoint | DistanceKM |

### Sample Data (First 20 rows):
```
State,LGA,LoadPoint,DistanceKM
Abia,Aba North,Ibeju_Dangote,573
Abia,Aba South,Ibeju_Dangote,578
Abia,Arochukwu,Ibeju_Dangote,615
Abia,Bende,Ibeju_Dangote,590
Abia,Ikwuano,Ibeju_Dangote,
Abia,Isiala Ngwa North,Ibeju_Dangote,0
Abia,Isiala Ngwa South,Ibeju_Dangote,582
Abia,Isuikwuato,Ibeju_Dangote,605
Adamawa,Demsa,Ibeju_Dangote,978
Adamawa,Fufure,Ibeju_Dangote,
Adamawa,Ganye,Ibeju_Dangote,1024
Adamawa,Gayuk,Ibeju_Dangote,1156
Adamawa,Gombi,Ibeju_Dangote,1089
Adamawa,Grie,Ibeju_Dangote,
Adamawa,Hong,Ibeju_Dangote,1205
Adamawa,Jada,Ibeju_Dangote,1178
Adamawa,Lamurde,Ibeju_Dangote,0
Adamawa,Madagali,Ibeju_Dangote,1267
Adamawa,Maiha,Ibeju_Dangote,1189
Adamawa,Mayo Belwa,Ibeju_Dangote,1034
```

## Upload Behavior:

### ✅ **Will Be Processed:**
- Rows with valid distance numbers (e.g., 573, 578, 615)
- Existing records will be updated with new distances
- New combinations of State+LGA+LoadPoint will be inserted

### ⏭️ **Will Be Skipped (No Errors):**
- Empty distance cells (e.g., Ikwuano, Fufure, Grie)
- Zero distance values (e.g., Isiala Ngwa North, Lamurde)  
- Invalid distance data (non-numeric, negative)
- Missing State or LGA names

### 🔄 **Smart Updates:**
- If you upload the same file twice, existing records get updated
- If you upload a new file with additional distances, only new data is added
- No duplicate records are created

## Nigerian States Coverage:

### All 36 States + FCT (774 LGAs Total):
- Abia (17 LGAs)
- Adamawa (21 LGAs)  
- Akwa Ibom (31 LGAs)
- Anambra (21 LGAs)
- Bauchi (20 LGAs)
- Bayelsa (8 LGAs)
- Benue (23 LGAs)
- Borno (27 LGAs)
- Cross River (18 LGAs)
- Delta (25 LGAs)
- Ebonyi (13 LGAs)
- Edo (18 LGAs)
- Ekiti (16 LGAs)
- Enugu (17 LGAs)
- FCT (6 Area Councils)
- Gombe (11 LGAs)
- Imo (27 LGAs)
- Jigawa (27 LGAs)
- Kaduna (23 LGAs)
- Kano (44 LGAs)
- Katsina (34 LGAs)
- Kebbi (21 LGAs)
- Kogi (21 LGAs)
- Kwara (16 LGAs)
- Lagos (20 LGAs)
- Nasarawa (13 LGAs)
- Niger (25 LGAs)
- Ogun (20 LGAs)
- Ondo (18 LGAs)
- Osun (30 LGAs)
- Oyo (33 LGAs)
- Plateau (17 LGAs)
- Rivers (23 LGAs)
- Sokoto (23 LGAs)
- Taraba (16 LGAs)
- Yobe (17 LGAs)
- Zamfara (14 LGAs)

## Load Points Examples:
- Ibeju_Dangote (Dangote Refinery, Lagos)
- Port_Harcourt_Depot (Rivers)
- Kaduna_Refinery (Kaduna)
- Warri_Refinery (Delta)
- [Add more depots as needed]

## Usage Tips:

1. **Prepare Excel File:**
   - Use exact column headers: State, LGA, LoadPoint, DistanceKM
   - Include all 774 LGAs (you can find the complete list online)
   - Leave distance blank for routes you don't have data for

2. **Upload Process:**
   - Convert Excel to JSON or use Excel upload endpoint
   - System will process all rows intelligently
   - Check the upload summary for statistics

3. **Incremental Updates:**
   - Upload additional depot distances by changing LoadPoint column
   - Add new distance data over time
   - System maintains data integrity automatically

## Expected Upload Result:
```json
{
  "message": "Distances uploaded successfully",
  "data": {
    "inserted": 245,
    "updated": 89, 
    "skipped": 440,
    "errors": 0,
    "summary": "Processed 774 rows: 245 new records inserted, 89 existing records updated, 440 rows skipped (missing/invalid data), 0 errors"
  }
}
```

This structure ensures your transport fare system can handle the complete Nigerian geography efficiently!
