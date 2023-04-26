import { Sequelize, Model, DataTypes, Optional } from "sequelize";

export const db = new Sequelize({
	dialect: "sqlite",
	storage: `./db/Attachments.db`,
	logging: false,
});

// Define Attachment model attributes
interface AttachmentAttributes {
	id: string;
	partialSize?: number;
	muxedSize?: number;
	filePath: string;
	releaseDate: Date;
	channelTitle: string;
}

type AttachmentCreationAttributes = Optional<AttachmentAttributes, "id">;

export class Attachment extends Model<AttachmentAttributes, AttachmentCreationAttributes> {
	declare id: string;
	declare partialSize?: number;
	declare muxedSize?: number;
	declare filePath: string;
	declare releaseDate: Date;
	declare channelTitle: string;
}

Attachment.init(
	{
		id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		filePath: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		releaseDate: {
			type: DataTypes.DATE,
			allowNull: false,
		},
		channelTitle: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		partialSize: DataTypes.INTEGER,
		muxedSize: DataTypes.INTEGER,
	},
	{
		sequelize: db,
		modelName: "Attachment",
	}
);

db.sync();
