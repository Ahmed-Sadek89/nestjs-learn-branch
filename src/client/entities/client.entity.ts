import { Profile } from "src/profile/entities/profile.entity";
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("clients")
export class Client {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
    })
    name!: string;

    @Column({
        type: "varchar",
        length: 50,
        nullable: false,
        unique: true,
    })
    email!: string

    @Column({
        type: "timestamp with time zone",
        nullable: false,
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt!: Date

    @OneToOne(
        () => Profile,
        (profile) => profile.client,
        {
            cascade: true,
            eager: true
        }
    )
    profile!: Profile
}
