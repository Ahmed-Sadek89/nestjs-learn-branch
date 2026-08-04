import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("books")
export class Book {
    @PrimaryGeneratedColumn({
        type: "integer",
    })
    id!: number;

    @Column({
        type: 'varchar',
        nullable: false,
        length: 50,
        unique: true,
    })
    title!: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    description!: string;

    @Column({
        type: "varchar",
        length: 100,
        nullable: false
    })
    author!: string;

    @Column({
        type: "integer",
        nullable: false,
    })
    price!: number;

    @Column({
        type: "boolean",
        default: false,
        nullable: false,
    })
    isPublished!: boolean;

    @Column({
        type: "timestamp",
        default: () => "CURRENT_TIMESTAMP",
        nullable: false,
    })
    createdAt!: Date;

}