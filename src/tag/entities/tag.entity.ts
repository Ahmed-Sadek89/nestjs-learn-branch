import { Post } from "src/post/entities/post.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity("tags")
export class Tag { 
    @PrimaryGeneratedColumn()
    id!: number

    @Column({
        type: "varchar",
        length: 20,
        nullable: false,
    })
    name!: string

    @Column({
        type: "timestamp with time zone",
        nullable: false,
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt!: Date

    @ManyToMany(
        () => Post,
        (post) => post.tags,
        {
            onDelete: "CASCADE",
        }
    )
    @JoinTable({
        name: "posts_tags",
        joinColumn: {name: "tag_id", referencedColumnName: "id"},
        inverseJoinColumn: {name: "post_id", referencedColumnName: "id"},
    })
    posts!: Post[]
}
