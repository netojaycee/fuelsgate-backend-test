import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { DepotHub } from '../entities/depot-hub.entity';
import { DepotHubDto } from '../dto/depot-hub.dto';

@Injectable()
export class DepotHubSeedService {
  private readonly logger = new Logger(DepotHubSeedService.name);

  constructor(@InjectModel('DepotHub') private readonly depotHubModel: Model<DepotHub>) { }

  private readonly DEPOT_HUBS: DepotHubDto[] = [
    {
      name: 'Lagos', depots: [
        "MRS Oil & Gas",
        "NIPCO",
        "Ardova Petroleum",
        "Conoil",
        "Aiteo",
        "Heyden Petroleum Company",
        "Eurafric Coastal Services",
        "Hensmor",
        "One Terminals",
        "A - Z Petroleum Products",
        "IBETO",
        "SPOG Petrochemical",
        "NNPC Terminal I(Oando Terminal I)",
        "Total / Oando JV",
        "Total Terminal I",
        "11 PLC(Formerly Mobil Oil Nigeria Plc)",
        "Integrated Oil & Gas",
        "African Terminals",
        "Bono Energy Storage Terminal",
        "Coolspring Energy",
        "Bovas & Company",
        "Gulf Treasures",
        "Quest ",
        "Eterna",
        "Duport Energy",
        "T - Time Petroleum Services",
        "Northbridge Energy",
        "Ibafon Oil",
        "Energy Network IBG",
        "Asharami Synergy",
        "Shema Petroleum",
        "AIPEC",
        "First Nigerian Independent Oil Company",
        "Fatgbems Petroleum Company",
        "Index Petrolube Africa",
        "Swift Oil",
        "Techno Oil",
        "Nakem Oil & Gas",
        "Chisco Energy Nigeria",
        "Dee Jones Petroleum & Gas",
        "Obat Oil & Petroleum",
        "Rahamaniyya Oil & Gas",
        "Pinnacle Oil & Gas FZE",
        "Dangote Oil Refinery",
        "Emadeb Energy Services",
        "Menj Oil",
        "Ocean Pride Energy Services",
        "WOSBAB Energy Solutions Nigeria",
        "A.A.Rano Nigeria",
        "Mao Petroleum",
        "First Royal Oil",
        "ShellPLux Nigeria",
        "Stallionaire Nigeria",
        "TMDK Oil Traders",
        "Rainoil",
        "J.Gold Petroleum & Global Investment",
        "Chipet International ",
        "Lister Oils",
      ]
    },
    {
      name: 'Port Harcourt', depots: [
        "NNPC(Oando) ",
        "NNPC(Oando) ",
        "Conoil",
        "Adova Petroleum",
        "Sea Petroleum Oil & Gas",
        "Petrolog Nigeria",
        "Avidor Oil and Gas",
        "Delmar Petroleum Company",
        "Masters Energy Oil & Gas",
        "Amicable Oil & Gas",
        "Petrostar Nigeria",
        "Liquid Bulk",
        "Shorelink Oil & Gas Services",
        "Bulk Strategic Reserve",
        "Ever Oil",
      ]
    },
    {
      name: 'Calabar', depots: [
        "Oryx Energies Fze ",
        "Hyde Tank & Terminals ",
        "Jenny Investments ",
        "Hudson Petroleum",
        "Ibafon Oil Fze",
        "Soroman Petroleum",
        "Vine Oil & Gas",
        "Linc Nigeria",
        "Northwest Petroleum & Gas",
        "Ammasco International",
        "Ontario Oil & Gas",
        "Mainland Oil & Gas",
        "Wabeco Petroleum",
        "Mettle Energy & Gas",
        "Dozzy Oil & Gas",
        "Hong Nigeria ",
        "Samon Petroleum FZE",
        "Rosa Mystica Energy",
        "Specialty Oil & Gas",
        "Fynefield Fze",
        "Ugo - Hannah Energy",
        "Alkanes Petroleum",
        "Sobaz Petroleum",
        "Newcore Energy International",
        "YSG Global Energy Company",
        "Blokks Petroleum",
        "Evergreen Field Fountain Energy",
        "Jezco Oil",
        "Zone 4 ",
        "Grand Petroleum and Chemicals",
        "Tempogate Oil and Energy Company",
        "Lubcon",
        "Mark - Claire",
      ]
    },
    {
      name: 'Warri', depots: [
        "Pinnacle Oil & Gas ",
        "Matrix Energy ",
        "A.Y.M Shafa Holdings / Shafa Energy",
        "Keonamex Petroleum",
        "Bluefin Energy",
        "A & E Petrol",
        "Adia Energy",
        "Parker Petroleum",
      ]
    },
    {
      name: 'Oghara', depots: [
        "Prudent Energy ",
        "Rainoil ",
        "Salbas Oil & Gas",
        "Cybernetics International Services ",
        "Othniel Brook",
      ]
    },
    {
      name: 'Koko', depots: [
        "Optima Energy Resources",
        "Sharon Petroleum",
        "Zamson Group",
        "A & M Oil",
        "Taurus Oil & Gas",
      ]
    }
  ];

  async seedDepotHubData() {
    const existingDepotHubs = await this.depotHubModel.find({});

    if (existingDepotHubs.length < 6) {
      await this.depotHubModel.deleteMany({});
      await this.depotHubModel.insertMany(this.DEPOT_HUBS);
      this.logger.log('Depot Hubs seeded successfully');
    } else {
      this.logger.log('Depot Hubs already exist. Seeding skipped.');
    }
  }
}
