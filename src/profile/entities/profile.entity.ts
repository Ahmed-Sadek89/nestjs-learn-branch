import { Client } from "src/client/entities/client.entity";
import { Post } from "src/post/entities/post.entity";
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

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

    @Column({
        type: "timestamp with time zone",
        nullable: false,
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt!: Date

    @OneToOne(
        () => Client,
        (client) => client.profile,
        {
            nullable: false,
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: "client_id" })
    client!: Client

    @OneToMany(
        () => Post,
        (post) => post.profile,
        {
            cascade: true,
            eager: true
        }
    )
    posts!: Post[]
}
