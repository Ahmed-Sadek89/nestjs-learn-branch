import { Client } from "src/client/entities/client.entity";
import { Profile } from "src/profile/entities/profile.entity";
import { Tag } from "src/tag/entities/tag.entity";
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("posts")
export class Post {

    @PrimaryGeneratedColumn()
    id!: number

    @Column({
        type: "varchar",
        length: 50,
        nullable: false,
        unique: true,
    })
    title!: string

    @Column({
        type: "text",
        default: "",
    })
    description!: string

    @Column({
        type: "timestamp with time zone",
        nullable: false,
        default: () => "CURRENT_TIMESTAMP",
    })
    created_at!: Date

    @ManyToOne(
        () => Client,
        (client) => client.posts,
        {
            nullable: false,
            onDelete: 'CASCADE',
        }
    )
    @JoinColumn({ name: "client_id" })
    client!: Client

    @ManyToOne(
        () => Profile,
        (profile) => profile.posts,
        {
            nullable: false,
            onDelete: 'CASCADE',  
        }
    )
    @JoinColumn({ name: "profile_id" })
    profile!: Profile


    @ManyToMany(
        () => Tag,
        (tag) => tag.posts,
        {
            cascade: true,
            eager: false,
        }
    )
    tags!: Tag[]
}
