import { Entity, Fields } from 'remult'

@Entity('test')
export class Test {
	@Fields.autoIncrement()
	id = 0
	@Fields.string()
	test_name = ''
}
