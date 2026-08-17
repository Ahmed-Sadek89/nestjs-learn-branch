import * as bcrypt from "bcrypt";
import { Post } from "src/post/entities/post.entity";
import { Profile } from "src/profile/entities/profile.entity";
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
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
        type: "varchar",
        length: 255,
        nullable: false,
        select: false, // it will not be displayed in any query
        default: "",
    })
    password!: string

    @Column({
        type: "timestamp with time zone",
        nullable: false,
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt!: Date

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (!this.password || this.password.startsWith("$2")) return;
        this.password = await bcrypt.hash(this.password, 10);
    }

    @OneToOne(
        () => Profile,
        (profile) => profile.client,
        {
            cascade: true,
            eager: false,
        }
    )
    profile!: Profile

    @OneToMany(
        () => Post,
        (post) => post.client,
        {
            cascade: true,
            eager: false
        }
    )
    posts!: Post[]
}
