import { Client } from "src/client/entities/client.entity";
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("profiles")
export class Profile {

    @PrimaryGeneratedColumn()
    id!: number

    @Column({
        type: "varchar",
        length: 50,
        nullable: false,
    })
    bio!: string

    @OneToOne(
        () => Client,
        (client) => client.profile,
        { nullable: false },
    )
    @JoinColumn({ name: "client_id" })
    client!: Client
}
